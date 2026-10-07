import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

const REPORT_TIMEZONE = 'Africa/Johannesburg';
const REPORT_HOUR = 9;

type ReportKind = 'WEEKLY' | 'MONTHLY';

type Period = {
  start: Date;
  end: Date;
  scheduledFor: Date;
  label: string;
};

@Injectable()
export class HealthReportNotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(
    HealthReportNotificationSchedulerService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.syncAll(new Date());

    setInterval(() => {
      void this.syncAll(new Date());
    }, 60_000);
  }

  async syncAll(now = new Date()) {
    await Promise.all([
      this.syncKind('WEEKLY', now),
      this.syncKind('MONTHLY', now),
    ]);
  }

  private async syncKind(kind: ReportKind, now: Date) {
    const period = this.getPeriod(kind, now);
    if (!period || period.scheduledFor > now) return;

    const patients = await this.prisma.patient.findMany({
      where: {
        healthJournalSettings: {
          is: {
            ...(kind === 'WEEKLY'
              ? { weeklySummary: true }
              : { monthlySummary: true }),
          },
        },
      },
      select: {
        id: true,
        userId: true,
        person: {
          select: {
            preferredName: true,
            firstName: true,
          },
        },
      },
    });

    for (const patient of patients) {
      try {
        await this.ensureReportNotifications(patient, kind, period);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          \`Failed to prepare \${kind.toLowerCase()} health report for \${patient.userId}: \${message}\`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private getPeriod(kind: ReportKind, now: Date): Period | null {
    const localNow = new Date(
      now.toLocaleString('en-US', { timeZone: REPORT_TIMEZONE }),
    );

    if (localNow.getHours() < REPORT_HOUR) return null;

    if (kind === 'WEEKLY') {
      const monday = new Date(localNow);
      const day = monday.getDay();
      const mondayOffset = day === 0 ? 6 : day - 1;
      monday.setDate(monday.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const previousMonday = new Date(monday);
      previousMonday.setDate(previousMonday.getDate() - 7);

      const previousSunday = new Date(monday);
      previousSunday.setDate(previousSunday.getDate() - 1);

      return {
        start: this.withJhbTime(
          previousMonday.getFullYear(),
          previousMonday.getMonth() + 1,
          previousMonday.getDate(),
          0,
        ),
        end: this.withJhbTime(
          monday.getFullYear(),
          monday.getMonth() + 1,
          monday.getDate(),
          0,
        ),
        scheduledFor: this.withJhbTime(
          monday.getFullYear(),
          monday.getMonth() + 1,
          monday.getDate(),
          REPORT_HOUR,
        ),
        label: \`\${this.formatDay(previousMonday)} – \${this.formatDay(previousSunday)}\`,
      };
    }

    const firstOfThisMonth = new Date(
      localNow.getFullYear(),
      localNow.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const previousMonthStart = new Date(firstOfThisMonth);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

    return {
      start: this.withJhbTime(
        previousMonthStart.getFullYear(),
        previousMonthStart.getMonth() + 1,
        1,
        0,
      ),
      end: this.withJhbTime(
        firstOfThisMonth.getFullYear(),
        firstOfThisMonth.getMonth() + 1,
        1,
        0,
      ),
      scheduledFor: this.withJhbTime(
        firstOfThisMonth.getFullYear(),
        firstOfThisMonth.getMonth() + 1,
        1,
        REPORT_HOUR,
      ),
      label: previousMonthStart.toLocaleDateString('en-ZA', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  private async ensureReportNotifications(
    patient: {
      id: string;
      userId: string;
      person: { preferredName: string | null; firstName: string };
    },
    kind: ReportKind,
    period: Period,
  ) {
    const notificationType =
      kind === 'WEEKLY'
        ? ('WEEKLY_HEALTH_REPORT' as any)
        : ('MONTHLY_HEALTH_REPORT' as any);

    const title =
      kind === 'WEEKLY'
        ? 'Your weekly health report is ready'
        : 'Your monthly health report is ready';

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: patient.userId,
        type: notificationType,
        scheduledFor: period.scheduledFor,
      },
      select: { id: true },
    });

    if (existing) return;

    const summary = await this.buildSummary(patient.id, kind, period);
    const body = \`Your health overview for \${period.label} is ready. \${summary} Open your Health Journal to review your activity and progress.\`;

    const inAppEnabled = await this.isEnabled(
      patient.userId,
      notificationType,
      NotificationChannel.IN_APP,
      true,
    );
    const pushEnabled = await this.isEnabled(
      patient.userId,
      notificationType,
      NotificationChannel.PUSH,
      false,
    );

    if (inAppEnabled) {
      await this.queueNotification({
        userId: patient.userId,
        type: notificationType,
        channel: NotificationChannel.IN_APP,
        title,
        body,
        actionUrl: '/health-journal',
        actionLabel: 'View health journal',
        scheduledFor: period.scheduledFor,
      });
    }

    if (pushEnabled) {
      await this.queueNotification({
        userId: patient.userId,
        type: notificationType,
        channel: NotificationChannel.PUSH,
        title,
        body: 'Your health report is ready to review.',
        actionUrl: '/health-journal',
        actionLabel: 'View health journal',
        scheduledFor: period.scheduledFor,
      });
    }
  }

  private async isEnabled(
    userId: string,
    type: any,
    channel: NotificationChannel,
    defaultEnabled: boolean,
  ) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType_channel: {
          userId,
          notificationType: type,
          channel,
        },
      },
      select: { enabled: true },
    });

    return preference?.enabled ?? defaultEnabled;
  }

  private async queueNotification(input: {
    userId: string;
    type: any;
    channel: NotificationChannel;
    title: string;
    body: string;
    actionUrl: string;
    actionLabel: string;
    scheduledFor: Date;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        scheduledFor: input.scheduledFor,
      },
      select: { id: true },
    });

    if (existing) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        channel: input.channel,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.NORMAL,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        scheduledFor: input.scheduledFor,
      },
      select: { id: true },
    });

    await this.prisma.notificationQueue.create({
      data: {
        notificationId: notification.id,
        scheduledFor: input.scheduledFor,
      },
    });
  }

  private async buildSummary(
    patientId: string,
    kind: ReportKind,
    period: Period,
  ) {
    const [
      journalEntries,
      symptomLogs,
      appointments,
      measurements,
      sleepSessions,
      workouts,
      activeMedications,
      activeGoals,
    ] = await this.prisma.$transaction([
      this.prisma.healthJournal.count({
        where: {
          patientId,
          createdAt: { gte: period.start, lt: period.end },
        },
      }),
      this.prisma.symptomLog.count({
        where: {
          clinicalEpisode: { patientId },
          startedAt: { gte: period.start, lt: period.end },
        },
      }),
      this.prisma.appointment.count({
        where: {
          patientId,
          scheduledStart: { gte: period.start, lt: period.end },
          status: { notIn: ['CANCELLED', 'DECLINED'] as any },
        },
      }),
      this.prisma.deviceMeasurement.count({
        where: {
          device: { patientId },
          measuredAt: { gte: period.start, lt: period.end },
        },
      }),
      this.prisma.sleepSession.count({
        where: {
          patientId,
          startedAt: { gte: period.start, lt: period.end },
        },
      }),
      this.prisma.workoutSession.count({
        where: {
          patientId,
          startedAt: { gte: period.start, lt: period.end },
        },
      }),
      this.prisma.patientMedication.count({
        where: {
          healthPassport: { patientId },
          status: 'ACTIVE' as any,
        },
      }),
      this.prisma.healthGoal.count({
        where: {
          patientId,
          status: 'ACTIVE' as any,
        },
      }),
    ]);

    const activity = \`\${journalEntries} journal \${journalEntries === 1 ? 'entry' : 'entries'}, \${symptomLogs} symptom \${symptomLogs === 1 ? 'record' : 'records'}, \${appointments} appointment\${appointments === 1 ? '' : 's'}, and \${measurements} health measurement\${measurements === 1 ? '' : 's'}\`;

    const connectedData =
      \`\${sleepSessions} sleep record\${sleepSessions === 1 ? '' : 's'}, \${workouts} workout\${workouts === 1 ? '' : 's'}, \${activeMedications} active medication\${activeMedications === 1 ? '' : 's'}, and \${activeGoals} active health goal\${activeGoals === 1 ? '' : 's'}\`;

    return kind === 'WEEKLY'
      ? \`This week you recorded \${activity}; \${connectedData} are also available in your health record.\`
      : \`This month you recorded \${activity}; \${connectedData} are also available in your health record.\`;
  }

  private withJhbTime(
    year: number,
    month: number,
    day: number,
    hour: number,
  ) {
    const monthText = String(month).padStart(2, '0');
    const dayText = String(day).padStart(2, '0');
    const hourText = String(hour).padStart(2, '0');

    return new Date(
      \`\${year}-\${monthText}-\${dayText}T\${hourText}:00:00+02:00\`,
    );
  }

  private formatDay(date: Date) {
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  }
}
