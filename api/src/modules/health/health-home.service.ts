import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthHomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        person: true,
        healthPassport: {
          include: {
            allergies: { include: { allergy: true } },
            conditions: { include: { condition: true } },
            medications: { include: { medication: true } },
          },
        },
        healthGoals: {
          include: { progress: true },
          orderBy: { createdAt: 'desc' },
        },
        wearableDevices: true,
        ownedFamilyMembers: {
          include: { memberPatient: { include: { person: true } } },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found for the authenticated user.');
    }

    const [upcomingAppointments, recentMeasurements, notifications] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId: patient.id, scheduledStart: { gte: new Date() } },
        include: { practitioner: { include: { person: true } }, practice: true },
        orderBy: { scheduledStart: 'asc' },
        take: 5,
      }),
      patient.wearableDevices.length
        ? this.prisma.deviceMeasurement.findMany({
            where: { deviceId: { in: patient.wearableDevices.map((device) => device.id) } },
            include: { device: true, deviceAlerts: true },
            orderBy: { measuredAt: 'desc' },
            take: 100,
          })
        : Promise.resolve([]),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const latestByType = new Map<string, (typeof recentMeasurements)[number]>();
    for (const measurement of recentMeasurements) {
      const type = String(measurement.measurementType);
      if (!latestByType.has(type)) latestByType.set(type, measurement);
    }

    const activeMedications = (patient.healthPassport?.medications ?? []).filter(
      (item) => String(item.status) === 'ACTIVE' && item.ongoing,
    );
    const activeConditions = (patient.healthPassport?.conditions ?? []).filter(
      (item) => String(item.status) === 'ACTIVE',
    );
    const activeGoals = patient.healthGoals.filter((goal) => String(goal.status) === 'ACTIVE');

    const goalProgress = activeGoals.map((goal) => {
      const progress = [...goal.progress].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );
      const latest = progress[progress.length - 1] as (typeof progress)[number] | undefined;
      const latestValue = latest?.value ?? goal.currentValue;
      const progressPercent = latest && 'progressPercent' in latest
        ? Number((latest as { progressPercent?: number }).progressPercent ?? 0)
        : 0;

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        latestValue,
        unit: goal.unit,
        targetDate: goal.targetDate,
        achievedAt: goal.achievedAt,
        progress,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
      };
    });

    const attention: Array<{ type: string; severity: string; title: string; description: string; actionUrl?: string; actionLabel?: string }> = [];
    for (const measurement of recentMeasurements) {
      for (const alert of measurement.deviceAlerts) {
        if (!alert.acknowledged) {
          attention.push({
            type: 'wearable-alert',
            severity: String(alert.severity),
            title: alert.title,
            description: alert.description ?? 'Your connected device has reported an alert.',
          });
        }
      }
    }

    const recentNotifications = notifications.map((notification) => ({
      id: notification.id,
      type: String(notification.type),
      title: notification.title,
      body: notification.body,
      channel: String(notification.channel),
      status: String(notification.status),
      priority: String(notification.priority),
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      scheduledFor: notification.scheduledFor,
      createdAt: notification.createdAt,
    }));

    const medicationNotifications = recentNotifications.filter((notification) =>
      notification.type.toUpperCase().includes('MEDICATION') ||
      notification.title.toLowerCase().includes('medication') ||
      notification.title.toLowerCase().includes('medicine') ||
      notification.body.toLowerCase().includes('medication'),
    );

    for (const notification of medicationNotifications.filter((item) =>
      !['READ', 'DISMISSED', 'CANCELLED'].includes(item.status.toUpperCase()),
    )) {
      attention.push({
        type: 'medication-notification',
        severity: notification.priority,
        title: notification.title,
        description: notification.body,
        actionUrl: notification.actionUrl ?? '/medications',
        actionLabel: notification.actionLabel ?? 'View medication',
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        name: patient.person.preferredName ?? patient.person.firstName,
        firstName: patient.person.firstName,
        lastName: patient.person.lastName,
        profileImageUrl: patient.person.profileImageUrl,
      },
      healthSnapshot: {
        activeConditions: activeConditions.map((item) => ({
          id: item.id,
          name: item.condition.name,
          severity: item.severity,
          chronic: item.chronic,
        })),
        allergies: (patient.healthPassport?.allergies ?? []).map((item) => ({
          id: item.id,
          name: item.allergy.name,
          severity: item.severity,
          reaction: item.reaction,
        })),
        bloodType: patient.healthPassport?.bloodType ?? null,
        weightKg: patient.weightKg,
        heightCm: patient.heightCm,
      },
      today: {
        upcomingAppointments,
        activeMedications: activeMedications.map((item) => ({
          id: item.id,
          name: item.medication.name,
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          instructions: item.instructions,
          adherencePercentage: item.adherencePercentage,
          missedDoses: item.missedDoses,
        })),
      },
      goals: goalProgress,
      family: patient.ownedFamilyMembers.map((member) => ({
        id: member.id,
        patientId: member.memberPatientId,
        relationship: member.relationship,
        canViewRecords: member.canViewRecords,
        canManageAppointments: member.canManageAppointments,
        canReceiveAlerts: member.canReceiveAlerts,
        name: member.memberPatient.person.preferredName ?? member.memberPatient.person.firstName,
      })),
      wearables: {
        devices: patient.wearableDevices.map((device) => ({
          id: device.id,
          manufacturer: device.manufacturer,
          model: device.model,
          deviceType: device.deviceType,
          status: device.status,
          lastSyncAt: device.lastSyncAt,
        })),
        latestMeasurements: Array.from(latestByType.values()).map((measurement) => ({
          id: measurement.id,
          type: measurement.measurementType,
          value: measurement.value,
          unit: measurement.unit,
          measuredAt: measurement.measuredAt,
          source: measurement.source,
        })),
      },
      notifications: recentNotifications,
      medicationNotifications,
      attention,
      journal: {
        mode: 'automatic',
        userInputRequired: false,
        sourceTypes: ['wearables', 'medications', 'appointments', 'goals', 'symptoms', 'clinical-events'],
      },
    };
  }
}
