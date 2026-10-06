import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getMedicationReminderFrequency,
  nextMedicationReminderOccurrence,
  recentMedicationReminderOccurrence,
} from '../patient-medications/medication-reminder.util';

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
        const message =
          error instanceof Error ? error.message : 'Unknown reminder sync error';

        // One broken reminder schedule must never stop the remaining patients'
        // reminder schedules from being generated.
        this.logger.error(
          `Reminder schedule ${schedule.id} could not be synced: ${message}`,
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
        patientMedication: { select: { id: true, status: true, ongoing: true, startedAt: true, endedAt: true, dosage: true, frequency: true, healthPassport: { select: { patient: { select: { userId: true } } } }, medication: { select: { name: true, genericName: true } } } },
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
      const medicationName = schedule.patientMedication.medication.name || schedule.patientMedication.medication.genericName || 'Medication';
      await this.prisma.notification.deleteMany({
        where: {
          userId: schedule.patientMedication.healthPassport.patient.userId,
          title: 'Medication reminder: ' + medicationName,
          status: { in: [NotificationStatus.PENDING, NotificationStatus.QUEUED] },
        },
      });
      return;
    }

    const frequency = getMedicationReminderFrequency(schedule.patientMedication.frequency);
    if (!frequency.doseCount || schedule.slots.length !== frequency.doseCount || (frequency.cadence === 'WEEKLY' && schedule.daysOfWeek.length !== 1) || schedule.daysOfWeek.length < 1 || schedule.daysOfWeek.some((day) => day < 1 || day > 7)) { await this.cancelSchedule(scheduleId); return; }

    for (const slot of schedule.slots) {
      // Normally we schedule the next future occurrence. When a reminder was
      // enabled at the scheduled minute, also allow a short catch-up window so
      // the current dose is not silently deferred until tomorrow.
      const recentOccurrence = recentMedicationReminderOccurrence({
        now,
        time: slot.time,
        daysOfWeek: schedule.daysOfWeek,
        timezone: schedule.timezone,
        notBefore: schedule.patientMedication.startedAt,
        notAfter: schedule.patientMedication.endedAt,
      });
      const nextOccurrence = nextMedicationReminderOccurrence({
        now,
        time: slot.time,
        daysOfWeek: schedule.daysOfWeek,
        timezone: schedule.timezone,
        notBefore: schedule.patientMedication.startedAt,
        notAfter: schedule.patientMedication.endedAt,
      });
      const occurrence = recentOccurrence ?? nextOccurrence;
      if (!occurrence) continue;

      const occurrenceStart = new Date(occurrence.getTime() - 1_000);
      const occurrenceEnd = new Date(occurrence.getTime() + 1_000);
      const sentWindowStart = new Date(occurrence.getTime() - 60_000);

      // A delivered occurrence is retained with scheduledFor=null, so dedupe
      // against both the exact scheduled time and a recent successful delivery.
      const existingNotifications = await this.prisma.notification.findMany({
        where: {
          medicationReminderSlotId: slot.id,
          channel: { in: [NotificationChannel.IN_APP, NotificationChannel.PUSH] },
          OR: [
            {
              scheduledFor: {
                gte: occurrenceStart,
                lte: occurrenceEnd,
              },
            },
            {
              sentAt: {
                gte: sentWindowStart,
                lte: now,
              },
            },
          ],
        },
        select: {
          channel: true,
          status: true,
        },
      });

      const existingChannels = new Set(
        existingNotifications
          .filter((notification) =>
            notification.status !== NotificationStatus.CANCELLED,
          )
          .map((notification) => String(notification.channel)),
      );

      const userId = await this.patientUserId(schedule.patientMedication.id);
      const medicationName =
        schedule.patientMedication.medication.name ||
        schedule.patientMedication.medication.genericName ||
        'Medication';
      const body = `It is time to take ${medicationName}${schedule.patientMedication.dosage ? ` (${schedule.patientMedication.dosage})` : ''}. Follow the instructions provided by your healthcare professional.`;

      if (!existingChannels.has(NotificationChannel.IN_APP)) {
        const created = await this.notificationsService.create({
          userId,
          type: 'REMINDER' as any,
          title: `Medication reminder: ${medicationName}`,
          body,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/medications',
          actionLabel: 'View medication',
          scheduledFor: occurrence.toISOString(),
        });

        if (created && !('skipped' in created)) {
          await this.prisma.notification.update({
            where: { id: created.id },
            data: { medicationReminderSlotId: slot.id },
          });
          await this.prisma.notificationQueue.create({
            data: { notificationId: created.id, scheduledFor: occurrence },
          });
          existingChannels.add(NotificationChannel.IN_APP);
        }
      }

      const pushConfigured = await this.pushConfigured(userId);
      if (
        pushConfigured &&
        !existingChannels.has(NotificationChannel.PUSH)
      ) {
        const created = await this.notificationsService.create({
          userId,
          type: 'REMINDER' as any,
          title: `Medication reminder: ${medicationName}`,
          body,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/medications',
          actionLabel: 'View medication',
          scheduledFor: occurrence.toISOString(),
        });

        if (created && !('skipped' in created)) {
          await this.prisma.notification.update({
            where: { id: created.id },
            data: { medicationReminderSlotId: slot.id },
          });
          await this.prisma.notificationQueue.create({
            data: { notificationId: created.id, scheduledFor: occurrence },
          });
        }
      }

      this.logger.debug(
        `Medication reminder schedule ${scheduleId}, slot ${slot.doseIndex}: occurrence=${occurrence.toISOString()}, dueNow=${occurrence <= now}, inApp=${existingChannels.has(NotificationChannel.IN_APP)}, pushConfigured=${pushConfigured}`,
      );
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
    if (!preference?.enabled) return false;
    const token = await this.prisma.deviceToken.findFirst({
      where: { userId, platform: 'WEB_PUSH', active: true },
      select: { id: true },
    });
    return Boolean(token);
  }
}