import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService as CategoryAwareGoalsEngineService, GoalMetricEventInput } from './goals-engine-v2.service';

@Injectable()
export class GoalsEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CategoryAwareGoalsEngineService,
  ) {}

  recordMetricEvent(input: GoalMetricEventInput) { return this.engine.recordMetricEvent(input); }
  removeSourceEvents(patientId: string, source: string, sourceId: string) { return this.engine.removeSourceEvents(patientId, source, sourceId); }

  recomputeMatchingGoals(patientId: string, metricType: string, metricKey: string, now = new Date()) {
    return this.hasEvents(patientId, metricType, metricKey).then((hasEvents) => hasEvents ? this.engine.recomputeMatchingGoals(patientId, metricType, metricKey, now) : []);
  }

  async recomputeAllMatchingGoals(patientId: string, now = new Date()) {
    const metrics = await this.prisma.$queryRaw<Array<{ metricType: string; metricKey: string }>>`
      SELECT DISTINCT c."metricType", c."metricKey"
      FROM "HealthGoalMetricConfig" c
      INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId"
      INNER JOIN "HealthGoalMetricEvent" e ON e."patientId" = g."patientId" AND e."metricType" = c."metricType" AND e."metricKey" = c."metricKey"
      WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE'
    `;
    const updated: any[] = [];
    for (const metric of metrics) updated.push(...await this.engine.recomputeMatchingGoals(patientId, metric.metricType, metric.metricKey, now));
    return updated;
  }

  backfillJournalMetrics(patientId: string) { return this.engine.backfillJournalMetrics(patientId); }

  async backfillPatientProfileMetrics(patientId: string) {
    await this.engine.backfillPatientProfileMetrics(patientId);
    const baseline = await this.prisma.patientBaseline.findUnique({ where: { patientId } });
    if (!baseline) return;

    const values: Array<[string, string, number | null]> = [
      ['BLOOD_PRESSURE', 'blood_pressure.systolic', baseline.systolicPressure],
      ['BLOOD_PRESSURE', 'blood_pressure.diastolic', baseline.diastolicPressure],
      ['BLOOD_GLUCOSE', 'blood_glucose.value', baseline.bloodGlucose == null ? null : Number(baseline.bloodGlucose)],
      ['CHOLESTEROL', 'cholesterol.total', baseline.cholesterol == null ? null : Number(baseline.cholesterol)],
      ['HEART_RATE', 'heart_rate.bpm', baseline.restingHeartRate],
      ['RESPIRATION', 'respiratory_rate.bpm', baseline.respiratoryRate],
      ['OXYGEN', 'oxygen_saturation.percent', baseline.oxygenSaturation == null ? null : Number(baseline.oxygenSaturation)],
      ['TEMPERATURE', 'temperature.c', baseline.bodyTemperature == null ? null : Number(baseline.bodyTemperature)],
    ];

    for (const [metricType, metricKey, loggedValue] of values) {
      if (loggedValue == null) continue;
      await this.engine.recordMetricEvent({
        patientId,
        metricType,
        metricKey,
        loggedValue,
        source: 'patient-baseline',
        sourceId: 'baseline',
      });
    }
  }

  snapshot(patientId: string) { return this.engine.snapshot(patientId); }

  private async hasEvents(patientId: string, metricType: string, metricKey: string) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey}
    `;
    return Number(rows[0]?.count ?? 0) > 0;
  }
}
