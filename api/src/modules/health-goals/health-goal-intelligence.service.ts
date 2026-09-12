import { Injectable } from '@nestjs/common';

import { GoalsEngineService } from './goals-engine.service';

export type HealthActivitySnapshot = {
  patientId: string;
  journalId?: string;
  exerciseMinutes?: number | null;
  waterIntakeMl?: number | null;
  sleepHours?: number | null;
};

@Injectable()
export class HealthGoalIntelligenceService {
  constructor(private readonly goalsEngine: GoalsEngineService) {}

  async syncDailyGoals(snapshot: HealthActivitySnapshot) {
    const updated: any[] = [];

    if (snapshot.exerciseMinutes != null) {
      updated.push(...await this.goalsEngine.recordMetricEvent({
        patientId: snapshot.patientId,
        metricType: 'EXERCISE',
        metricKey: 'exercise.minutes',
        loggedValue: Number(snapshot.exerciseMinutes),
        source: 'health-journal',
        sourceId: snapshot.journalId,
      }));
    }

    if (snapshot.waterIntakeMl != null) {
      updated.push(...await this.goalsEngine.recordMetricEvent({
        patientId: snapshot.patientId,
        metricType: 'HYDRATION',
        metricKey: 'hydration.ml',
        loggedValue: Number(snapshot.waterIntakeMl),
        source: 'health-journal',
        sourceId: snapshot.journalId,
      }));
    }

    if (snapshot.sleepHours != null) {
      updated.push(...await this.goalsEngine.recordMetricEvent({
        patientId: snapshot.patientId,
        metricType: 'SLEEP',
        metricKey: 'sleep.hours',
        loggedValue: Number(snapshot.sleepHours),
        source: 'health-journal',
        sourceId: snapshot.journalId,
      }));
    }

    return updated;
  }

  async syncTodayFromJournal(patientId: string, date = new Date()) {
    void date;
    await this.goalsEngine.backfillJournalMetrics(patientId);
    const updated: any[] = [];

    for (const metric of [
      ['EXERCISE', 'exercise.minutes'],
      ['HYDRATION', 'hydration.ml'],
      ['SLEEP', 'sleep.hours'],
    ]) {
      updated.push(...await this.goalsEngine.recomputeMatchingGoals(
        patientId,
        metric[0],
        metric[1],
      ));
    }

    return updated;
  }
}
