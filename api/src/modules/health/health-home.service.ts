import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type UpdatedGoal = {
  id: string;
  progressPercent: number;
  currentValue: number;
  status: 'ACHIEVED' | 'ON_TRACK' | 'IMPROVING' | 'STAGNANT';
};

@Injectable()
export class HealthHomeService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateBmi(weightKg: number, heightCm: number) {
    const heightM = heightCm / 100;
    if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || heightCm <= 0 || weightKg <= 0) {
      throw new BadRequestException('Weight and height must be positive numbers.');
    }
    return Number((weightKg / (heightM * heightM)).toFixed(2));
  }

  private adultBmiCategory(bmi: number, dateOfBirth?: Date | null) {
    if (!dateOfBirth) return null;
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDelta = today.getMonth() - dateOfBirth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    if (age < 18) return null;
    if (bmi < 18.5) return 'UNDERWEIGHT';
    if (bmi < 25) return 'NORMAL';
    if (bmi < 30) return 'OVERWEIGHT';
    if (bmi < 35) return 'OBESITY_CLASS_I';
    if (bmi < 40) return 'OBESITY_CLASS_II';
    return 'OBESITY_CLASS_III';
  }

  private calculateWeightGoalProgress(startingWeight: number, currentWeight: number, targetLossKg: number) {
    if (targetLossKg <= 0) return 0;
    const lossAchieved = startingWeight - currentWeight;
    return Math.min(100, Math.max(0, Number(((lossAchieved / targetLossKg) * 100).toFixed(2))));
  }

  private progressStatus(percent: number, achieved: boolean) {
    if (achieved) return 'ACHIEVED' as const;
    if (percent >= 75) return 'ON_TRACK' as const;
    if (percent > 0) return 'IMPROVING' as const;
    return 'STAGNANT' as const;
  }

  async updateWeight(userId: string, weightKg: number, heightCm?: number) {
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000) {
      throw new BadRequestException('Please provide a valid weight in kilograms.');
    }
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { person: true, baseline: true, healthGoals: { where: { status: 'ACTIVE' }, include: { progress: { orderBy: { measuredAt: 'asc' } } } } },
    });
    if (!patient) throw new NotFoundException('Patient profile not found for the authenticated user.');
    const resolvedHeight = heightCm ?? Number(patient.heightCm ?? patient.baseline?.heightCm ?? 0);
    if (!Number.isFinite(resolvedHeight) || resolvedHeight <= 0 || resolvedHeight > 300) {
      throw new BadRequestException('A valid height in centimetres is required to calculate BMI.');
    }
    const bmi = this.calculateBmi(weightKg, resolvedHeight);
    const bmiCategory = this.adultBmiCategory(bmi, patient.person.dateOfBirth);
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({ where: { id: patient.id }, data: { weightKg, heightCm: resolvedHeight } });
      if (patient.baseline) {
        await tx.patientBaseline.update({ where: { patientId: patient.id }, data: { heightCm: resolvedHeight } });
      } else {
        await tx.patientBaseline.create({ data: { patientId: patient.id, weightKg, heightCm: resolvedHeight, bmi, establishedAt: now } });
      }

      const weightGoals = patient.healthGoals.filter((goal) => String(goal.category) === 'WEIGHT');
      const updatedGoals: UpdatedGoal[] = [];
      for (const goal of weightGoals) {
        const baselineWeight = patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null;
        const historicalWeights = goal.progress.map((entry) => Number(entry.currentValue)).filter((value) => Number.isFinite(value) && value > 0);
        const historicalStartingWeight = historicalWeights.length ? Math.max(...historicalWeights) : null;
        // Never use the latest/current weight as the starting point. Prefer the
        // immutable baseline, but recover a previously recorded higher starting
        // weight when older goal progress contains it.
        const startingWeight = Math.max(
          ...[baselineWeight, historicalStartingWeight, patient.weightKg != null ? Number(patient.weightKg) : null, weightKg].filter(
            (value): value is number => value != null && Number.isFinite(value) && value > 0,
          ),
        );
        const targetLossKg = goal.targetValue != null ? Number(goal.targetValue) : 0;
        if (!Number.isFinite(targetLossKg) || targetLossKg <= 0) continue;
        const lossAchievedKg = Math.max(0, startingWeight - weightKg);
        const progressPercent = this.calculateWeightGoalProgress(startingWeight, weightKg, targetLossKg);
        const achieved = lossAchievedKg >= targetLossKg;
        const status = this.progressStatus(progressPercent, achieved);
        const goalTargetWeight = startingWeight - targetLossKg;
        await tx.healthGoal.update({ where: { id: goal.id }, data: { currentValue: weightKg, ...(achieved ? { status: 'ACHIEVED', achievedAt: now } : {}) } });
        await tx.healthGoalProgress.create({ data: { healthGoalId: goal.id, currentValue: weightKg, progressPercent, status, measuredAt: now, notes: `Weight updated from My Health. Starting weight: ${startingWeight} kg. Goal weight: ${goalTargetWeight} kg. ${lossAchievedKg.toFixed(1)} kg of ${targetLossKg.toFixed(1)} kg lost. BMI: ${bmi}.` } });
        updatedGoals.push({ id: goal.id, progressPercent, currentValue: weightKg, status });
      }
      return { updatedGoals };
    });
    return { weightKg, heightCm: resolvedHeight, bmi, bmiCategory, recordedAt: now.toISOString(), goals: result.updatedGoals };
  }

  async getForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        person: true,
        healthPassport: { include: { allergies: { include: { allergy: true } }, conditions: { include: { condition: true } }, medications: { include: { medication: true } } } },
        healthGoals: { include: { progress: { orderBy: { measuredAt: 'asc' } } }, orderBy: { createdAt: 'desc' } },
        wearableDevices: true,
        ownedFamilyMembers: { include: { memberPatient: { include: { person: true } } } },
        baseline: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient profile not found for the authenticated user.');
    const [upcomingAppointments, recentMeasurements, notifications] = await Promise.all([
      this.prisma.appointment.findMany({ where: { patientId: patient.id, scheduledStart: { gte: new Date() } }, include: { practitioner: { include: { person: true } }, practice: true }, orderBy: { scheduledStart: 'asc' }, take: 5 }),
      patient.wearableDevices.length ? this.prisma.deviceMeasurement.findMany({ where: { deviceId: { in: patient.wearableDevices.map((device) => device.id) } }, include: { device: true, deviceAlerts: true }, orderBy: { measuredAt: 'desc' }, take: 100 }) : Promise.resolve([]),
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const latestByType = new Map<string, (typeof recentMeasurements)[number]>();
    for (const measurement of recentMeasurements) { const type = String(measurement.measurementType); if (!latestByType.has(type)) latestByType.set(type, measurement); }
    const activeMedications = (patient.healthPassport?.medications ?? []).filter((item) => String(item.status) === 'ACTIVE' && item.ongoing);
    const activeConditions = (patient.healthPassport?.conditions ?? []).filter((item) => String(item.status) === 'ACTIVE');
    const activeGoals = patient.healthGoals.filter((goal) => String(goal.status) === 'ACTIVE');
    const goalProgress = activeGoals.map((goal) => {
      const progress = goal.progress;
      const latest = progress[progress.length - 1];
      const latestValue = latest?.currentValue ?? goal.currentValue;
      let progressPercent = Number(latest?.progressPercent ?? 0);
      let displayStatus = String(goal.status);
      let displayTargetValue = goal.targetValue;
      if (String(goal.category) === 'WEIGHT' && goal.targetValue != null && latestValue != null && patient.weightKg != null) {
        const baselineWeight = patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null;
        const historicalWeights = progress.map((entry) => Number(entry.currentValue)).filter((value) => Number.isFinite(value) && value > 0);
        const historicalStartingWeight = historicalWeights.length ? Math.max(...historicalWeights) : null;
        const startingWeight = Math.max(...[baselineWeight, historicalStartingWeight].filter((value): value is number => value != null && Number.isFinite(value) && value > 0));
        const targetLossKg = Number(goal.targetValue);
        if (Number.isFinite(startingWeight) && Number.isFinite(targetLossKg) && targetLossKg > 0) {
          const currentWeight = Number(patient.weightKg);
          const lossAchievedKg = Math.max(0, startingWeight - currentWeight);
          progressPercent = this.calculateWeightGoalProgress(startingWeight, currentWeight, targetLossKg);
          displayStatus = lossAchievedKg >= targetLossKg ? 'ACHIEVED' : this.progressStatus(progressPercent, false);
          displayTargetValue = targetLossKg;
        }
      }
      return { id: goal.id, title: goal.title, description: goal.description, category: goal.category, priority: goal.priority, status: displayStatus, targetValue: displayTargetValue, currentValue: goal.currentValue, latestValue, unit: goal.unit, targetDate: goal.targetDate, achievedAt: displayStatus === 'ACHIEVED' ? goal.achievedAt : null, progress, progressPercent: Math.min(100, Math.max(0, progressPercent)) };
    });
    const attention: Array<{ type: string; severity: string; title: string; description: string; actionUrl?: string; actionLabel?: string }> = [];
    for (const measurement of recentMeasurements) for (const alert of measurement.deviceAlerts) if (!alert.acknowledged) attention.push({ type: 'wearable-alert', severity: String(alert.severity), title: alert.title, description: alert.description ?? 'Your connected device has reported an alert.' });
    const recentNotifications = notifications.map((notification) => ({ id: notification.id, type: String(notification.type), title: notification.title, body: notification.body, channel: String(notification.channel), status: String(notification.status), priority: String(notification.priority), actionUrl: notification.actionUrl, actionLabel: notification.actionLabel, scheduledFor: notification.scheduledFor, createdAt: notification.createdAt }));
    const medicationNotifications = recentNotifications.filter((notification) => notification.type.toUpperCase().includes('MEDICATION') || notification.title.toLowerCase().includes('medication') || notification.title.toLowerCase().includes('medicine') || notification.body.toLowerCase().includes('medication'));
    for (const notification of medicationNotifications.filter((item) => !['READ', 'DISMISSED', 'CANCELLED'].includes(item.status.toUpperCase()))) attention.push({ type: 'medication-notification', severity: notification.priority, title: notification.title, description: notification.body, actionUrl: notification.actionUrl ?? '/medications', actionLabel: notification.actionLabel ?? 'View medication' });
    const currentWeight = patient.weightKg != null ? Number(patient.weightKg) : null;
    const currentHeight = patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null;
    const currentBmi = currentWeight && currentHeight ? this.calculateBmi(currentWeight, currentHeight) : null;
    return {
      generatedAt: new Date().toISOString(),
      patient: { id: patient.id, patientNumber: patient.patientNumber, name: patient.person.preferredName ?? patient.person.firstName, firstName: patient.person.firstName, lastName: patient.person.lastName, profileImageUrl: patient.person.profileImageUrl },
      healthSnapshot: { activeConditions: activeConditions.map((item) => ({ id: item.id, name: item.condition.name, severity: item.severity, chronic: item.chronic })), allergies: (patient.healthPassport?.allergies ?? []).map((item) => ({ id: item.id, name: item.allergy.name, severity: item.severity, reaction: item.reaction })), bloodType: patient.healthPassport?.bloodType ?? null, weightKg: currentWeight, heightCm: currentHeight, bmi: currentBmi, bmiCategory: currentBmi != null ? this.adultBmiCategory(currentBmi, patient.person.dateOfBirth) : null },
      today: { upcomingAppointments, activeMedications: activeMedications.map((item) => ({ id: item.id, name: item.medication.name, dosage: item.dosage, frequency: item.frequency, route: item.route, instructions: item.instructions, adherencePercentage: item.adherencePercentage, missedDoses: item.missedDoses })) },
      goals: goalProgress,
      family: patient.ownedFamilyMembers.map((member) => ({ id: member.id, patientId: member.memberPatientId, relationship: member.relationship, canViewRecords: member.canViewRecords, canManageAppointments: member.canManageAppointments, canReceiveAlerts: member.canReceiveAlerts, name: member.memberPatient.person.preferredName ?? member.memberPatient.person.firstName })),
      wearables: { devices: patient.wearableDevices.map((device) => ({ id: device.id, manufacturer: device.manufacturer, model: device.model, deviceType: device.deviceType, status: device.status, lastSyncAt: device.lastSyncAt })), latestMeasurements: Array.from(latestByType.values()).map((measurement) => ({ id: measurement.id, type: measurement.measurementType, value: measurement.value, unit: measurement.unit, measuredAt: measurement.measuredAt, source: measurement.source })) },
      notifications: recentNotifications, medicationNotifications, attention,
      journal: { mode: 'automatic', userInputRequired: false, sourceTypes: ['wearables', 'medications', 'appointments', 'goals', 'symptoms', 'clinical-events'] },
    };
  }
}
