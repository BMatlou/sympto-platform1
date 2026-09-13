import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from './goals-engine.service';

interface MetricActionInput {
  metricType: string;
  metricKey: string;
  loggedValue: number;
  occurredAt?: string;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class GoalMetricActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  async sync(patientId: string, input: MetricActionInput) {
    await this.ensureMetricConfig(patientId, input.metricType, input.metricKey);

    return this.goalsEngine.recordMetricEvent({
      patientId,
      metricType: input.metricType,
      metricKey: input.metricKey,
      loggedValue: input.loggedValue,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      source: input.source ?? 'frontend',
      sourceId: input.sourceId,
      metadata: input.metadata,
    });
  }

  private async ensureMetricConfig(
    patientId: string,
    metricType: string,
    metricKey: string,
  ) {
    if (metricType !== 'SMOKING_CESSATION' || metricKey !== 'smoking.cigarettes') return;

    const goals = await this.prisma.healthGoal.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
        category: 'SMOKING',
      },
      select: {
        id: true,
        targetValue: true,
        unit: true,
      },
    });

    for (const goal of goals) {
      await this.prisma.$executeRaw`
        INSERT INTO "HealthGoalMetricConfig"
          ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText")
        VALUES
          (${goal.id}, ${metricType}, ${metricKey}, 'DAILY', ${goal.targetValue}, ${`Log the number of cigarettes you smoke today. Target: ${goal.targetValue ?? 'set in goal'} ${goal.unit ?? 'cigarettes/day'}.`})
        ON CONFLICT ("healthGoalId") DO UPDATE SET
          "metricType" = EXCLUDED."metricType",
          "metricKey" = EXCLUDED."metricKey",
          "frequency" = EXCLUDED."frequency",
          "frequencyTarget" = EXCLUDED."frequencyTarget",
          "guidanceText" = EXCLUDED."guidanceText",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    }
  }
}
