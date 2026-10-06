import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getMedicationReminderFrequency, nextMedicationReminderOccurrence } from '../patient-medications/medication-reminder.util';

@Injectable()
export class MedicationReminderSchedulerService {
  private readonly logger = new Logger(MedicationReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async syncAll(now = new Date()) {
    const schedules = await this.prisma.medicationReminderSchedule.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    for (const schedule of schedules) {
      try {
        await this.syncSchedule(schedule.id, now);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Medication reminder schedule ${schedule.id} failed to sync: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  async syncMedication(patientMedicationId: string, now = new Date()) {
    const schedule = await this.prisma.medicationReminderSchedule.findUnique({
      where: { patientMedicationId },
      select: { id: true },
    });
    if (!schedule) return;
    await this.syncSchedule(schedule.id, now);
  }

  async cancelSchedule(scheduleId: string) {
    const slots = await this.prisma.medicationReminderSlot.findMany({
      where: { scheduleId },
      select: { id: true },
    });
    const slotIds = slots.map((slot) => slot.id);
    if (!slotIds.length) return;
    await this.prisma.notification.deleteMany({
      where: {
        medicationReminderSlotId: { in: slotIds },
        status: { in: [NotificationStatus.PENDING, NotificationStatus.QUEUED] },
      },
    });
  }

  private async syncSchedule(scheduleId: string, now: Date) {
    const schedule = await this.prisma.medicationReminderSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        patientMedication: { select: { id: true, status: true, ongoing: true, startedAt: true, endedAt: true, dosage: true, frequency: true, medication: { select: { name: true, genericName: true } } } },
        slots: { orderBy: { doseIndex: 'asc' } },
      },
    });
    if (!schedule) return;

    const activeMedication = schedule.patientMedication.status === 'ACTIVE'
      && schedule.patientMedication.ongoing !== false
      && (!schedule.patientMedication.startedAt || schedule.patientMedication.startedAt <= now)
      && (!schedule.patientMedication.endedAt || schedule.patientMedication.endedAt > now);

    if (!schedule.enabled || !activeMedication) {
      await this.cancelSchedule(scheduleId);
      return;
    }

    const frequency = getMedicationReminderFrequency(schedule.patientMedication.frequency);
    if (!frequency.doseCount || schedule.slots.length !== frequency.doseCount || (frequency.cadence === 'WEEKLY' && schedule.daysOfWeek.length !== 1) || schedule.daysOfWeek.length < 1 || schedule.daysOfWeek.some((day) => day < 1 || day > 7)) { await this.cancelSchedule(scheduleId); return; }

    const slotIds = schedule.slots.map((slot) => slot.id);
    const pending = await this.prisma.notification.findMany({
      where: {
        medicationReminderSlotId: { in: slotIds },
        status: { in: [NotificationStatus.PENDING, NotificationStatus.QUEUED] },
        scheduledFor: { gte: now },
      },
      select: { medicationReminderSlotId: true, channel: true },
    });
    const pendingKeys = new Set(pending.map((item) => `${item.medicationReminderSlotId}:${String(item.channel)}`));

    for (const slot of schedule.slots) {
      const next = nextMedicationReminderOccurrence({
        now,
        time: slot.time,
        daysOfWeek: schedule.daysOfWeek,
        timezone: schedule.timezone,
        notBefore: schedule.patientMedication.startedAt,
        notAfter: schedule.patientMedication.endedAt,
      });
      if (!next) continue;

      const medicationName = schedule.patientMedication.medication.name || schedule.patientMedication.medication.genericName || 'Medication';
      const body = `It is time to take ${medicationName}${schedule.patientMedication.dosage ? ` (${schedule.patientMedication.dosage})` : ''}. Follow the instructions provided by your healthcare professional.`;

      const createInApp = !pendingKeys.has(`${slot.id}:${NotificationChannel.IN_APP}`);
      if (createInApp) {
        const created = await this.notificationsService.create({
          userId: await this.patientUserId(schedule.patientMedication.id),
          type: 'REMINDER' as any,
          title: `Medication reminder: ${medicationName}`,
          body,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/medications',
          actionLabel: 'View medication',
          scheduledFor: next.toISOString(),
        });
        if (created && !('skipped' in created)) {
          await this.prisma.notification.update({ where: { id: created.id }, data: { medicationReminderSlotId: slot.id } });
          const notificationId = created.id;
          await this.prisma.notificationQueue.create({ data: { notificationId, scheduledFor: next } });
          pendingKeys.add(`${slot.id}:${NotificationChannel.IN_APP}`);
        }
      }

      const pushConfigured = await this.pushConfigured(await this.patientUserId(schedule.patientMedication.id));
      if (pushConfigured && !pendingKeys.has(`${slot.id}:${NotificationChannel.PUSH}`)) {
        const created = await this.notificationsService.create({
          userId: await this.patientUserId(schedule.patientMedication.id),
          type: 'REMINDER' as any,
          title: `Medication reminder: ${medicationName}`,
          body,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/medications',
          actionLabel: 'View medication',
          scheduledFor: next.toISOString(),
        });
        if (created && !('skipped' in created)) {
          await this.prisma.notification.update({ where: { id: created.id }, data: { medicationReminderSlotId: slot.id } });
          await this.prisma.notificationQueue.create({ data: { notificationId: created.id, scheduledFor: next } });
          pendingKeys.add(`${slot.id}:${NotificationChannel.PUSH}`);
        }
      }
    }
  }

  private async patientUserId(patientMedicationId: string) {
    const row = await this.prisma.patientMedication.findUnique({
      where: { id: patientMedicationId },
      select: { healthPassport: { select: { patient: { select: { userId: true } } } } },
    });
    return row?.healthPassport.patient.userId ?? '';
  }

  private async pushConfigured(userId: string) {
    if (!userId) return false;
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_notificationType_channel: { userId, notificationType: 'REMINDER', channel: NotificationChannel.PUSH } },
      select: { enabled: true },
    });
    if (preference && !preference.enabled) return false;
    const token = await this.prisma.deviceToken.findFirst({
      where: { userId, platform: 'WEB_PUSH', active: true },
      select: { id: true },
    });
    return Boolean(token);
  }
}