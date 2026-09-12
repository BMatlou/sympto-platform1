import { Injectable } from '@nestjs/common';
import { GoalsEngineService } from './goals-engine-v2.service';

export type HealthActivitySnapshot = {
  patientId: string;
  journalId?: string;
  exerciseMinutes?: number | null;
  waterIntakeMl?: number | null;
  sleepHours?: number | null;
  weightKg?: number | null;
  stressLevel?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
};

@Injectable()
export class HealthGoalIntelligenceService {
  constructor(private readonly goalsEngine: GoalsEngineService) {}

  async syncDailyGoals(snapshot: HealthActivitySnapshot) {
    return this.syncTodayFromJournal(snapshot.patientId);
  }

  async syncTodayFromJournal(patientId: string, _date = new Date()) {
    await this.goalsEngine.backfillJournalMetrics(patientId);
    await this.goalsEngine.backfillPatientProfileMetrics(patientId);
    return this.goalsEngine.recomputeAllMatchingGoals(patientId);
  }
}
