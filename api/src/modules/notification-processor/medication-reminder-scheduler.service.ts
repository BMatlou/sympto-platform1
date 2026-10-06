import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getMedicationReminderFrequency, nextMedicationReminderOccurrence } from '../patient-medications/medication-reminder.util';

@Injectable()
export class MedicationReminderSchedulerService {
  private readonly logger = new Logger(MedicationReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
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
        patientMedication: { select: { id: true, status: true, ongoing: true, startedAt: true, endedAt: true, dosage: true, frequency: true, healthPassport: { select: { patient: { select: { userId: true } } } }, medication: { select: { name: true, genericName: true } } } },
        slots: { orderBy: { doseIndex: 'asc' } },
      },
    });
    if (!schedule) return;

    const medication = schedule.patientMedication;
    const userId = medication.healthPassport.patient.userId;

    const activeMedication =
      medication.status === 'ACTIVE' &&
      medication.ongoing !== false &&
      (!medication.startedAt || medication.startedAt <= now) &&
      (!medication.endedAt || medication.endedAt > now);

    if (!schedule.enabled || !activeMedication) {
      await this.cancelSchedule(scheduleId);
      const medicationName =
        medication.medication.name || medication.medication.genericName || 'Medication';

      await this.prisma.notification.deleteMany({
        where: {
          userId,
          title: `Medication reminder: ${medicationName}`,
          status: { in: [NotificationStatus.PENDING, NotificationStatus.QUEUED] },
        },
      });
      return;
    }

    const frequency = getMedicationReminderFrequency(medication.frequency);
    if (
      !frequency.doseCount ||
      schedule.slots.length !== frequency.doseCount ||
      (frequency.cadence === 'WEEKLY' && schedule.daysOfWeek.length !== 1) ||
      schedule.daysOfWeek.length < 1 ||
      schedule.daysOfWeek.some((day) => day < 1 || day > 7)
    ) {
      await this.cancelSchedule(scheduleId);
      this.logger.warn(
        `Skipping medication reminder schedule ${scheduleId}: invalid schedule shape for ${medication.frequency ?? 'unknown'} frequency.`,
      );
      return;
    }

    const slotIds = schedule.slots.map((slot) => slot.id);
    const pending = await this.prisma.notification.findMany({
      where: {
        medicationReminderSlotId: { in: slotIds },
        status: { in: [NotificationStatus.PENDING, NotificationStatus.QUEUED] },
      },
      select: { medicationReminderSlotId: true, channel: true, scheduledFor: true },
    });

    const pendingKeys = new Set(
      pending.map(
        (item) =>
          `${item.medicationReminderSlotId}:${String(item.channel)}:${item.scheduledFor?.toISOString() ?? ''}`,
      ),
    );

    const medicationName =
      medication.medication.name || medication.medication.genericName || 'Medication';
    const body =
      `It is time to take ${medicationName}` +
      (medication.dosage ? ` (${medication.dosage})` : '') +
      '. Follow the instructions provided by your healthcare professional.';

    const inAppPreference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType_channel: {
          userId,
          notificationType: 'REMINDER',
          channel: NotificationChannel.IN_APP,
        },
      },
      select: { enabled: true },
    });

    for (const slot of schedule.slots) {
      const next = nextMedicationReminderOccurrence({
        now,
        time: slot.time,
        daysOfWeek: schedule.daysOfWeek,
        timezone: schedule.timezone,
        notBefore: medication.startedAt,
        notAfter: medication.endedAt,
      });

      if (!next) continue;

      const inAppKey = `${slot.id}:${NotificationChannel.IN_APP}:${next.toISOString()}`;
      if (!pendingKeys.has(inAppKey) && (!inAppPreference || inAppPreference.enabled)) {
        const created = await this.createQueuedReminder({
          userId,
          slotId: slot.id,
          channel: NotificationChannel.IN_APP,
          medicationName,
          body,
          scheduledFor: next,
        });
        if (created) pendingKeys.add(inAppKey);
      }

      const pushConfigured = await this.pushConfigured(userId);
      const pushKey = `${slot.id}:${NotificationChannel.PUSH}:${next.toISOString()}`;
      if (pushConfigured && !pendingKeys.has(pushKey)) {
        const created = await this.createQueuedReminder({
          userId,
          slotId: slot.id,
          channel: NotificationChannel.PUSH,
          medicationName,
          body,
          scheduledFor: next,
        });
        if (created) pendingKeys.add(pushKey);
      }
    }
  }

  private async createQueuedReminder(args: {
    userId: string;
    slotId: string;
    channel: NotificationChannel;
    medicationName: string;
    body: string;
    scheduledFor: Date;
  }) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType_channel: {
          userId: args.userId,
          notificationType: 'REMINDER',
          channel: args.channel,
        },
      },
      select: { enabled: true },
    });

    if (preference && !preference.enabled) {
      return null;
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const notification = await tx.notification.create({
          data: {
            userId: args.userId,
            type: 'REMINDER' as any,
            title: `Medication reminder: ${args.medicationName}`,
            body: args.body,
            channel: args.channel,
            status: NotificationStatus.PENDING,
            priority: NotificationPriority.NORMAL,
            actionUrl: '/medications',
            actionLabel: 'View medication',
            scheduledFor: args.scheduledFor,
            medicationReminderSlotId: args.slotId,
          },
          select: { id: true },
        });

        await tx.notificationQueue.create({
          data: {
            notificationId: notification.id,
            scheduledFor: args.scheduledFor,
          },
        });

        return notification;
      });

      this.logger.log(
        `Scheduled medication reminder ${created.id} for ${args.channel} at ${args.scheduledFor.toISOString()}.`,
      );
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to queue medication reminder for ${args.medicationName} (${args.channel}): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
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