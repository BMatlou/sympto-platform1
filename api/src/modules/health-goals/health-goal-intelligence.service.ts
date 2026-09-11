import { Injectable } from '@nestjs/common';
import { HealthGoalCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { HealthGoalsService } from './health-goals.service';

export type HealthActivitySnapshot = {
  patientId: string;
  journalId?: string;
  exerciseMinutes?: number | null;
  waterIntakeMl?: number | null;
  sleepHours?: number | null;
};

@Injectable()
export class HealthGoalIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  private startOfDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private endOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private async getTrackingSettings(patientId: string) {
    return this.prisma.healthJournalSettings.findUnique({
      where: { patientId },
      select: {
        trackExercise: true,
        trackWater: true,
        trackSleep: true,
      },
    });
  }

  private async getActiveGoals(patientId: string) {
    return this.prisma.healthGoal.findMany({
      where: {
        patientId,
        status: { in: ['ACTIVE', 'ACHIEVED'] },
        category: {
          in: [
            HealthGoalCategory.EXERCISE,
            HealthGoalCategory.HYDRATION,
            HealthGoalCategory.SLEEP,
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Recalculate all daily measurable goals affected by today's tracked activity.
   * Missing/untracked activity is deliberately ignored; it is not treated as zero.
   */
  async syncDailyGoals(snapshot: HealthActivitySnapshot) {
    const settings = await this.getTrackingSettings(snapshot.patientId);
    if (!settings) return [];

    const goals = await this.getActiveGoals(snapshot.patientId);
    const updated = [];

    for (const goal of goals) {
      if (
        goal.category === HealthGoalCategory.EXERCISE &&
        settings.trackExercise &&
        snapshot.exerciseMinutes != null
      ) {
        updated.push(
          await this.healthGoalsService.recordProgress(goal.id, {
            currentValue: String(snapshot.exerciseMinutes),
            notes: 'Automatically updated from tracked exercise activity.',
          }),
        );
      }

      if (
        goal.category === HealthGoalCategory.HYDRATION &&
        settings.trackWater &&
        snapshot.waterIntakeMl != null
      ) {
        updated.push(
          await this.healthGoalsService.recordProgress(goal.id, {
            currentValue: String(snapshot.waterIntakeMl),
            notes: 'Automatically updated from tracked hydration activity.',
          }),
        );
      }

      if (
        goal.category === HealthGoalCategory.SLEEP &&
        settings.trackSleep &&
        snapshot.sleepHours != null
      ) {
        updated.push(
          await this.healthGoalsService.recordProgress(goal.id, {
            currentValue: String(snapshot.sleepHours),
            notes: 'Automatically updated from tracked sleep activity.',
          }),
        );
      }
    }

    return updated;
  }

  /**
   * Rebuild today's goal-driving snapshot from the latest journal values.
   * This is useful when an existing journal entry is edited.
   */
  async syncTodayFromJournal(patientId: string, date = new Date()) {
    const journals = await this.prisma.healthJournal.findMany({
      where: {
        patientId,
        createdAt: {
          gte: this.startOfDay(date),
          lte: this.endOfDay(date),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        exerciseMinutes: true,
        waterIntakeMl: true,
        sleepHours: true,
      },
    });

    if (!journals.length) return [];

    const latest = {
      journalId: journals[0].id,
      exerciseMinutes: journals.find((journal) => journal.exerciseMinutes != null)?.exerciseMinutes ?? null,
      waterIntakeMl: journals.find((journal) => journal.waterIntakeMl != null)?.waterIntakeMl ?? null,
      sleepHours: journals.find((journal) => journal.sleepHours != null)?.sleepHours
        ? Number(journals.find((journal) => journal.sleepHours != null)?.sleepHours)
        : null,
    };

    return this.syncDailyGoals({
      patientId,
      journalId: latest.journalId,
      exerciseMinutes: latest.exerciseMinutes,
      waterIntakeMl: latest.waterIntakeMl,
      sleepHours: latest.sleepHours,
    });
  }
}
