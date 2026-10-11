import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { UpdateHealthWeightDto } from './dto/update-health-weight.dto';

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] as const;
const ACTIVE_MEDICATION_STATUSES = ['ACTIVE', 'PAUSED'] as const;

@Injectable()
export class HealthHomeService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatient(userId: string, requestedPatientId?: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true },
    });
    if (!owner?.patient) throw new NotFoundException('Patient health profile not found.');

    if (!requestedPatientId || requestedPatientId === owner.patient.id) {
      return { ownerPatient: owner.patient, patientId: owner.patient.id };
    }

    const familyLink = await this.prisma.familyMember.findFirst({
      where: {
        ownerPatientId: owner.patient.id,
        memberPatientId: requestedPatientId,
        canViewRecords: true,
      },
    });
    if (!familyLink) throw new NotFoundException('You are not authorised to view this family member.');
    return { ownerPatient: owner.patient, patientId: requestedPatientId };
  }

  async getHealthHome(userId: string, requestedPatientId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: true,
        patient: {
          include: {
            healthPassport: {
              include: {
                immunizations: {
                  include: { immunization: true },
                  orderBy: { administeredAt: 'desc' },
                },
              },
            },
            baseline: true,
            healthJournalSettings: true,
            emergencyContacts: true,
            person: true,
          },
        },
      },
    });

    if (!user?.patient) throw new NotFoundException('Patient health profile not found.');

    const ownerPatient = user.patient;
    let patient = ownerPatient;
    let selectedUserId = userId;

    if (requestedPatientId && requestedPatientId !== ownerPatient.id) {
      const familyLink = await this.prisma.familyMember.findFirst({
        where: {
          ownerPatientId: ownerPatient.id,
          memberPatientId: requestedPatientId,
          canViewRecords: true,
        },
      });

      if (!familyLink) throw new NotFoundException('You are not authorised to view this family member.');

      const familyPatient = await this.prisma.patient.findUnique({
        where: { id: requestedPatientId },
        include: {
          healthPassport: {
            include: {
              immunizations: {
                include: { immunization: true },
                orderBy: { administeredAt: 'desc' },
              },
            },
          },
          baseline: true,
          healthJournalSettings: true,
          emergencyContacts: true,
          person: true,
        },
      });

      if (!familyPatient) throw new NotFoundException('Family member health profile not found.');
      patient = familyPatient;
      selectedUserId = familyPatient.userId;
    }

    const patientId = patient.id;
    const healthPassportId = patient.healthPassport?.id;
    const now = new Date();
    const immunizations = patient.healthPassport?.immunizations ?? [];
    const weightKg = patient.weightKg == null ? null : Number(patient.weightKg);
    const heightCm = patient.heightCm == null ? null : Number(patient.heightCm);
    const bmi = weightKg && heightCm ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;
    const bmiCategory = bmi == null ? null : bmi < 18.5 ? 'UNDERWEIGHT' : bmi < 25 ? 'NORMAL' : bmi < 30 ? 'OVERWEIGHT' : 'OBESITY';

    const [allergies, conditions, medications, goals, family, appointments, notifications, devices, measurements, symptomLogs, aiObservations, labOrders, imagingStudies, carePlans] = await Promise.all([
      this.prisma.patientAllergy.findMany({ where: { healthPassportId: healthPassportId ?? '' }, include: { allergy: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.patientCondition.findMany({ where: { healthPassportId: healthPassportId ?? '' }, include: { condition: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.patientMedication.findMany({ where: { healthPassportId: healthPassportId ?? '', status: { in: [...ACTIVE_MEDICATION_STATUSES] } }, include: { medication: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.healthGoal.findMany({ where: { patientId, status: 'ACTIVE' }, include: { progress: { orderBy: { measuredAt: 'desc' }, take: 1 } }, orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }] }),
      this.prisma.familyMember.findMany({ where: { ownerPatientId: ownerPatient.id }, include: { memberPatient: { include: { person: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.appointment.findMany({ where: { patientId, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }, scheduledStart: { gte: now } }, include: { practitioner: { include: { person: true } }, practice: true, telemedicineSession: true }, orderBy: { scheduledStart: 'asc' }, take: 10 }),
      this.prisma.notification.findMany({ where: { userId: selectedUserId, readAt: null, status: { in: ['PENDING', 'QUEUED', 'SENT', 'DELIVERED'] } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 10 }),
      this.prisma.wearableDevice.findMany({ where: { patientId }, orderBy: { lastSyncAt: 'desc' }, include: { _count: { select: { measurements: true } } } }),
      this.prisma.deviceMeasurement.findMany({ where: { device: { patientId } }, orderBy: { measuredAt: 'desc' }, take: 100 }),
      this.prisma.symptomLog.findMany({ where: { clinicalEpisode: { patientId }, status: { in: ['ACTIVE', 'COMPLETED'] } }, include: { clinicalEpisode: true, symptoms: { include: { symptom: true } }, triggers: true }, orderBy: { startedAt: 'desc' }, take: 10 }),
      this.prisma.aIObservation.findMany({ where: { symptomLog: { clinicalEpisode: { patientId } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.labOrder.findMany({ where: { patientId }, include: { laboratory: true, items: { include: { test: true, labResults: { orderBy: { createdAt: 'desc' }, take: 1, include: { items: { include: { test: true } } } } } } }, orderBy: { orderedAt: 'desc' }, take: 10 }),
      this.prisma.imagingStudy.findMany({ where: { patientId }, include: { imagingCenter: true, reports: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.carePlan.findMany({ where: { patientId, status: { in: ['ACTIVE', 'DRAFT'] } }, include: { practitioner: { include: { person: true } }, goals: true, tasks: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const latestMeasurements = new Map<string, (typeof measurements)[number]>();
    for (const measurement of measurements) if (!latestMeasurements.has(measurement.measurementType)) latestMeasurements.set(measurement.measurementType, measurement);
    const latest = (type: string) => latestMeasurements.get(type as never) ?? null;

    const attention = [
      ...notifications.filter((n) => n.priority === 'HIGH' || n.priority === 'URGENT').map((n) => ({ type: 'NOTIFICATION', severity: n.priority, title: n.title, description: n.body, actionUrl: n.actionUrl })),
      ...aiObservations.filter((o) => o.requiresAttention && !o.reviewed).map((o) => ({ type: 'AI_OBSERVATION', severity: 'HIGH', title: 'Sympto noticed something worth reviewing', description: o.observation, actionUrl: '/health-journal' })),
      ...labOrders.flatMap((order) => order.items.flatMap((item) => item.labResults.flatMap((result) => result.items.filter((ri) => ri.abnormal || ri.critical).map((ri) => ({ type: ri.critical ? 'CRITICAL_RESULT' : 'ABNORMAL_RESULT', severity: ri.critical ? 'URGENT' : 'HIGH', title: `${ri.test.name} result needs review`, description: ri.comments ?? 'A recent laboratory result is outside the expected range.', actionUrl: '/tests-results' }))))),
    ].slice(0, 10);

    const journalSignals = {
      generatedAt: now.toISOString(),
      sourceCount: measurements.length + appointments.length + symptomLogs.length + notifications.length + goals.length,
      signals: ['SLEEP', 'STEPS', 'HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION', 'BODY_TEMPERATURE', 'RESPIRATORY_RATE', 'WEIGHT'].map(latest).filter(Boolean).map((m) => ({ type: m!.measurementType, value: Number(m!.value), unit: m!.unit, measuredAt: m!.measuredAt, source: m!.source })),
      recentSymptoms: symptomLogs.slice(0, 5).map((log) => ({ id: log.id, title: log.title, severity: log.overallSeverity, progression: log.progression, startedAt: log.startedAt, symptoms: log.symptoms.map((item) => item.symptom.name) })),
      medicationCount: medications.length,
      upcomingAppointmentCount: appointments.length,
    };

    const goalsWithProgress = goals.map((goal) => ({ ...goal, latestProgress: goal.progress[0] ?? null }));
    const activeAllergies = allergies.filter((item) => item.status === 'ACTIVE' || !item.status);
    const activeConditions = conditions.filter((item) => item.status === 'ACTIVE' && !item.resolvedAt);

    return {
      generatedAt: now.toISOString(),
      profile: patient.person,
      patient: { id: patientId, patientNumber: patient.patientNumber, firstName: patient.person?.firstName ?? '', lastName: patient.person?.lastName ?? '', name: [patient.person?.firstName, patient.person?.lastName].filter(Boolean).join(' '), heightCm, weightKg, bmi, bmiCategory, deceased: patient.deceased },
      healthPassport: patient.healthPassport,
      healthSnapshot: { baseline: patient.baseline, activeConditions, allergies: activeAllergies, immunizations, bloodType: patient.healthPassport?.bloodType ?? null, rhesusFactor: patient.healthPassport?.rhesusFactor ?? null, weightKg, heightCm, bmi, bmiCategory, latestMeasurements: journalSignals.signals, connectedDevices: devices.map((device) => ({ id: device.id, manufacturer: device.manufacturer, model: device.model, deviceType: device.deviceType, status: device.status, lastSyncAt: device.lastSyncAt, measurementCount: device._count.measurements })) },
      attention,
      today: { notifications, upcomingAppointments: appointments.slice(0, 5), activeMedications: medications, activeMedicationCount: medications.length, activeGoalCount: goals.length },
      medications, appointments, goals: goalsWithProgress, healthGoals: goalsWithProgress, family, allergies, conditions, immunizations, emergencyContacts: patient.emergencyContacts, symptoms: symptomLogs, recentResults: { laboratory: labOrders, imaging: imagingStudies }, carePlans, journal: journalSignals, ai: { recentObservations: aiObservations }, settings: patient.healthJournalSettings, healthJournalSettings: patient.healthJournalSettings,
    };
  }

  async getTimeline(userId: string, requestedPatientId?: string) {
    const { patientId } = await this.resolvePatient(userId, requestedPatientId);
    const medicalRecord = await this.prisma.medicalRecord.findUnique({ where: { patientId } });

    const [episodes, encounters] = await Promise.all([
      this.prisma.clinicalEpisode.findMany({
        where: { patientId },
        include: { practitioner: { include: { person: true } }, encounter: { include: { encounterType: true } }, appointment: true, symptomLogs: { orderBy: { startedAt: 'desc' }, take: 5 }, diagnoses: true, clinicalNotes: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),
      medicalRecord ? this.prisma.encounter.findMany({
        where: { medicalRecordId: medicalRecord.id },
        include: { encounterType: true, practitioner: { include: { person: true } }, clinicalNotes: { orderBy: { createdAt: 'desc' }, take: 5 }, vitals: { include: { vitalType: true }, orderBy: { measuredAt: 'desc' }, take: 20 }, diagnoses: { include: { diagnosis: true } }, procedures: { include: { procedure: true } } },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }) : [],
    ]);

    return {
      patientId,
      medicalRecordId: medicalRecord?.id ?? null,
      episodes,
      encounters,
      counts: { episodes: episodes.length, encounters: encounters.length },
    };
  }

  async updateWeight(userId: string, dto: UpdateHealthWeightDto, requestedPatientId?: string) {
    const { patientId } = await this.resolvePatient(userId, requestedPatientId);
    const patient = await this.prisma.patient.update({ where: { id: patientId }, data: { weightKg: dto.weightKg, ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}) } });
    const weightKg = Number(patient.weightKg);
    const heightCm = patient.heightCm == null ? null : Number(patient.heightCm);
    const bmi = heightCm ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : 0;
    const bmiCategory = bmi === 0 ? null : bmi < 18.5 ? 'UNDERWEIGHT' : bmi < 25 ? 'NORMAL' : bmi < 30 ? 'OVERWEIGHT' : 'OBESITY';
    return { weightKg, heightCm, bmi, bmiCategory, recordedAt: new Date().toISOString(), goals: [] };
  }
}
