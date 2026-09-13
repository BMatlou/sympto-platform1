import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HealthGoalProgressStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AlcoholResetScheduler {
  private readonly logger = new Logger(AlcoholResetScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // Monday 00:00 South Africa Standard Time.
  @Cron('0 0 0 * * 1', {
    name: 'weekly-alcohol-reset',
    timeZone: 'Africa/Johannesburg',
    waitForCompletion: true,
  })
  async handleWeeklyAlcoholReset(): Promise<void> {
    this.logger.log('Initiating weekly alcohol goal budget calculations and reset pipeline...');

    try {
      const activeAlcoholGoals = await this.prisma.$queryRaw<
        Array<{ id: string; currentValue: Prisma.Decimal | null; targetValue: Prisma.Decimal | null }>
      >`
        SELECT
          g."id",
          g."currentValue",
          g."targetValue"
        FROM "HealthGoal" g
        INNER JOIN "HealthGoalMetricConfig" c
          ON c."healthGoalId" = g."id"
        WHERE c."metricType" = 'ALCOHOL'
          AND g."status" = 'ACTIVE'
      `;

      if (!activeAlcoholGoals.length) {
        this.logger.log('No active alcohol moderation goals require a weekly reset.');
        return;
      }

      const resetAt = new Date();
      const previousWeekClosedAt = new Date(resetAt.getTime() - 1000);

      await this.prisma.$transaction(async (tx) => {
        for (const goal of activeAlcoholGoals) {
          const previousTotal = Number(goal.currentValue ?? 0);
          const target = Number(goal.targetValue ?? 0);
          const previousPercentage = target > 0 ? Math.min(100, Math.max(0, (previousTotal / target) * 100)) : 0;
          const previousStatus = previousTotal <= target
            ? HealthGoalProgressStatus.ON_TRACK
            : HealthGoalProgressStatus.DECLINING;

          // Keep an immutable weekly close-out row before resetting the active baseline.
          await tx.healthGoalProgress.create({
            data: {
              healthGoalId: goal.id,
              currentValue: String(previousTotal),
              progressPercent: String(previousPercentage.toFixed(2)),
              status: previousStatus,
              notes: `Previous week closed out at: ${previousTotal} drinks against a budget of ${target}. Reset at Monday 00:00 SAST.`,
              measuredAt: previousWeekClosedAt,
            },
          });

          await tx.healthGoal.update({
            where: { id: goal.id },
            data: {
              currentValue: '0',
            },
          });
        }
      });

      this.logger.log(`Successfully reset budget paths for ${activeAlcoholGoals.length} active alcohol goals.`);
    } catch (error) {
      this.logger.error('Failed to complete weekly alcohol reset database transaction', error);
    }
  }
}
