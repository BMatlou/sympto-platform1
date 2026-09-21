import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthGoalsService } from './health-goals.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';

type AuthenticatedRequest = { user?: { sub?: string; id?: string; userId?: string } };

@Controller('patient-health-goals')
@UseGuards(JwtAuthGuard)
export class PatientHealthGoalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalsService: HealthGoalsService,
    private readonly healthGoalIntelligence: HealthGoalIntelligenceService,
  ) {}

  private userId(request: AuthenticatedRequest) {
    return request.user?.sub ?? request.user?.userId ?? request.user?.id ?? '';
  }

  private async ensureMetricEventStorage() {
    await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HealthGoalMetricEvent" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "patientId" TEXT NOT NULL,
        "metricType" VARCHAR(64) NOT NULL,
        "metricKey" VARCHAR(128) NOT NULL,
        "loggedValue" NUMERIC(12,2) NOT NULL,
        "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "source" VARCHAR(64) NOT NULL,
        "sourceId" VARCHAR(128),
        "metadata" JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HealthGoalMetricEvent_pkey" PRIMARY KEY ("id")
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "HealthGoalMetricEvent"
        ADD COLUMN IF NOT EXISTS "patientId" TEXT,
        ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
        ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "loggedValue" NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "source" VARCHAR(64),
        ADD COLUMN IF NOT EXISTS "sourceId" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "metadata" JSONB,
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_patient_metric_idx"
        ON "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "occurredAt")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_source_idx"
        ON "HealthGoalMetricEvent" ("source", "sourceId")
    `);
  }

  private async assertOwnGoal(goalId: string, userId: string) {
    // Authorization must not depend on the legacy relationship hydrator.
    // findOne() still performs relationship work that can fail when the old
    // HealthGoalRelation table is out of sync. Ownership only needs the goal
    // and its patient's user id, so keep this check on the current Prisma schema.
    const goal = await this.prisma.healthGoal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        patientId: true,
        title: true,
        category: true,
        status: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        targetDate: true,
        priority: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!goal) {
      throw new BadRequestException('Health goal not found.');
    }

    if (!userId || goal.patient?.userId !== userId) {
      throw new ForbiddenException('Patient health goal does not belong to the authenticated user.');
    }

    return goal;
  }

  @Post()
  async create(@Body() dto: CreateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    const patient = await this.healthGoalsService.findPatientForUser(this.userId(request));
    if (!patient || patient.id !== dto.patientId) {
      throw new ForbiddenException('Patient health goal does not belong to the authenticated user.');
    }
    const { metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, patientId, targetDate, achievedAt, ...goalData } = dto;
    const parsedTargetDate = targetDate ? new Date(targetDate) : undefined;
    const parsedAchievedAt = achievedAt ? new Date(achievedAt) : undefined;
    if (parsedTargetDate && Number.isNaN(parsedTargetDate.getTime())) throw new BadRequestException('Target date is invalid.');
    if (parsedAchievedAt && Number.isNaN(parsedAchievedAt.getTime())) throw new BadRequestException('Achievement date is invalid.');
    const goal = await this.prisma.healthGoal.create({ data: { ...goalData, patientId, targetDate: parsedTargetDate, achievedAt: parsedAchievedAt }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    await this.healthGoalsService.configureMetric(goal.id, { metricType, metricKey, frequency, frequencyTarget: frequencyTarget == null ? undefined : Number(frequencyTarget), aggregation, comparison, guidanceText });
    if (String(goalData.category).toUpperCase() === 'WEIGHT' && String(metricType).toUpperCase() === 'WEIGHT') await this.healthGoalsService.captureWeightGoalBaseline(goal.id, String(patient.id), goal.createdAt);
    await this.healthGoalIntelligence.syncGoalRelations(patient.id);
    return this.healthGoalsService.findOne(goal.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    const existing = await this.assertOwnGoal(id, this.userId(request));
    if (String(existing.status ?? '').toUpperCase() === 'ACHIEVED') throw new ForbiddenException('Completed health goals are locked. Start a new goal instead.');
    const { patientId: _patientId, metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, targetDate, achievedAt, ...goalData } = dto;
    const parsedTargetDate = targetDate ? new Date(targetDate) : undefined;
    const parsedAchievedAt = achievedAt ? new Date(achievedAt) : undefined;
    if (parsedTargetDate && Number.isNaN(parsedTargetDate.getTime())) throw new BadRequestException('Target date is invalid.');
    if (parsedAchievedAt && Number.isNaN(parsedAchievedAt.getTime())) throw new BadRequestException('Achievement date is invalid.');
    const isSmokingGoal = String(existing.category).toUpperCase() === 'SMOKING' || String(goalData.category ?? '').toUpperCase() === 'SMOKING';
    const isWeightGoal = String(existing.category).toUpperCase() === 'WEIGHT' || String(goalData.category ?? '').toUpperCase() === 'WEIGHT';
    const isWeightRevision = isWeightGoal && (
      goalData.targetValue !== undefined ||
      comparison !== undefined ||
      String(goalData.category ?? existing.category).toUpperCase() !== String(existing.category).toUpperCase()
    );
    const updated = await this.prisma.healthGoal.update({
      where: { id },
      data: {
        ...goalData,
        ...(targetDate !== undefined ? { targetDate: parsedTargetDate } : {}),
        ...(achievedAt !== undefined ? { achievedAt: parsedAchievedAt } : {}),
        ...((isSmokingGoal || isWeightRevision) ? { status: 'ACTIVE', achievedAt: null, currentValue: null } : {}),
      },
      include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } },
    });
    if (isSmokingGoal || isWeightRevision) await this.prisma.healthGoalProgress.deleteMany({ where: { healthGoalId: id } });
    if (isWeightRevision) await this.healthGoalsService.captureWeightGoalBaseline(id, String(existing.patientId), new Date());
    if (metricType || metricKey || frequency || frequencyTarget !== undefined || aggregation || comparison || guidanceText !== undefined) {
      await this.healthGoalsService.configureMetric(id, { metricType, metricKey, frequency, frequencyTarget: frequencyTarget == null ? undefined : Number(frequencyTarget), aggregation, comparison, guidanceText });
    }
    await this.healthGoalIntelligence.syncGoalRelations(existing.patient.id);
    return this.healthGoalsService.findOne(updated.id);
  }

  @Get(':id/relationships')
  async relationships(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));
    return this.healthGoalIntelligence.getGoalRelationships(goal.id);
  }

  private async buildWeightIntelligenceFallback(goalId: string) {
    const goal = await this.prisma.healthGoal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        title: true,
        category: true,
        targetValue: true,
        unit: true,
        targetDate: true,
        priority: true,
        status: true,
        createdAt: true,
        patientId: true,
        patient: {
          select: {
            weightKg: true,
            heightCm: true,
            baseline: {
              select: {
                weightKg: true,
                heightCm: true,
                bmi: true,
              },
            },
            person: {
              select: {
                dateOfBirth: true,
                gender: true,
              },
            },
          },
        },
      },
    });

    if (!goal) {
      throw new BadRequestException('Health goal not found.');
    }

    const latestRows = await this.prisma.$queryRaw<Array<{ loggedValue: number | string | null }>>`
      SELECT "loggedValue"::double precision AS "loggedValue"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${goal.patientId}
        AND "metricType" = 'WEIGHT'
        AND "metricKey" = 'weight.kg'
        AND "source" <> 'goal-baseline'
        AND "occurredAt" <= CURRENT_TIMESTAMP
      ORDER BY "occurredAt" DESC
      LIMIT 1
    `;

    const latestWeight =
      latestRows[0]?.loggedValue != null
        ? Number(latestRows[0].loggedValue)
        : goal.patient.weightKg != null
          ? Number(goal.patient.weightKg)
          : goal.patient.baseline?.weightKg != null
            ? Number(goal.patient.baseline.weightKg)
            : null;

    const heightCm =
      goal.patient.heightCm != null
        ? Number(goal.patient.heightCm)
        : goal.patient.baseline?.heightCm != null
          ? Number(goal.patient.baseline.heightCm)
          : null;

    const currentBmi =
      latestWeight != null && Number.isFinite(latestWeight) &&
      heightCm != null && Number.isFinite(heightCm) && heightCm > 0
        ? latestWeight / ((heightCm / 100) ** 2)
        : null;

    const baselineWeight =
      goal.patient.baseline?.weightKg != null
        ? Number(goal.patient.baseline.weightKg)
        : goal.patient.weightKg != null
          ? Number(goal.patient.weightKg)
          : latestWeight;

    const comparisonRows = await this.prisma.$queryRaw<Array<{ comparison: string | null }>>`
      SELECT "comparison"
      FROM "HealthGoalMetricConfig"
      WHERE "healthGoalId" = ${goal.id}
      LIMIT 1
    `;

    const comparison = String(comparisonRows[0]?.comparison ?? 'CLOSEST').toUpperCase();

    return {
      goal: {
        id: goal.id,
        title: goal.title,
        comparison,
        targetValue: goal.targetValue == null ? null : Number(goal.targetValue),
        unit: goal.unit,
        targetDate: goal.targetDate,
        priority: goal.priority,
        status: goal.status,
        createdAt: goal.createdAt,
      },
      profile: {
        age: goal.patient.person.dateOfBirth
          ? Math.max(
              0,
              new Date().getFullYear() -
                goal.patient.person.dateOfBirth.getFullYear() -
                (
                  new Date().getMonth() < goal.patient.person.dateOfBirth.getMonth() ||
                  (
                    new Date().getMonth() === goal.patient.person.dateOfBirth.getMonth() &&
                    new Date().getDate() < goal.patient.person.dateOfBirth.getDate()
                  )
                    ? 1
                    : 0
                ),
            )
          : null,
        gender: goal.patient.person.gender ?? null,
        heightCm,
        currentWeightKg: latestWeight,
        currentBmi,
        baselineWeightKg: Number.isFinite(baselineWeight ?? Number.NaN) ? baselineWeight : null,
        baselineBmi:
          baselineWeight != null && heightCm != null && heightCm > 0
            ? baselineWeight / ((heightCm / 100) ** 2)
            : goal.patient.baseline?.bmi != null
              ? Number(goal.patient.baseline.bmi)
              : null,
        adultBmiApplicable: true,
      },
      weight: {
        latestKg: latestWeight,
        average7dKg: latestWeight,
        average30dKg: latestWeight,
        changeKg:
          baselineWeight != null && latestWeight != null
            ? latestWeight - baselineWeight
            : null,
        percentChange:
          baselineWeight != null && latestWeight != null && baselineWeight !== 0
            ? ((latestWeight - baselineWeight) / baselineWeight) * 100
            : null,
        trendKgPerWeek: null,
        dataPoints: latestWeight != null ? 1 : 0,
        maintenanceBand:
          baselineWeight != null
            ? { min: baselineWeight - 1.5, max: baselineWeight + 1.5 }
            : null,
        withinMaintenanceBand:
          comparison === 'CLOSEST' && baselineWeight != null && latestWeight != null
            ? Math.abs(latestWeight - baselineWeight) <= 1.5
            : null,
        targetWeightKg: comparison === 'CLOSEST'
          ? baselineWeight
          : comparison === 'INCREASE_TO' && baselineWeight != null && goal.targetValue != null
            ? baselineWeight + Number(goal.targetValue)
            : comparison === 'DECREASE_TO' && baselineWeight != null && goal.targetValue != null
              ? baselineWeight - Number(goal.targetValue)
              : null,
        requestedChangeKg:
          comparison === 'CLOSEST' || goal.targetValue == null
            ? null
            : Number(goal.targetValue),
        targetBmi: null,
        targetBmiStatus: null,
        targetNeedsReview: false,
        lowerScreeningWeightKg:
          heightCm != null && heightCm > 0
            ? 18.5 * ((heightCm / 100) ** 2)
            : null,
        upperScreeningWeightKg:
          heightCm != null && heightCm > 0
            ? 24.9 * ((heightCm / 100) ** 2)
            : null,
        status:
          latestWeight == null || baselineWeight == null
            ? 'INSUFFICIENT_DATA'
            : comparison === 'CLOSEST'
              ? Math.abs(latestWeight - baselineWeight) <= 1.5
                ? 'STABLE'
                : latestWeight > baselineWeight
                  ? 'DRIFTING_UP'
                  : 'DRIFTING_DOWN'
              : 'STABLE',
      },
      healthContext: {
        connectedGoals: [],
        activeConditions: [],
        activeMedications: [],
        medicalRecord: null,
      },
      clinicalContext: {
        activeMedicationCount: 0,
        activeConditionCount: 0,
        recentSymptomCount: 0,
        symptomsDataAvailable: false,
      },
      recommendedSupportingGoals: [],
      targetedSupportiveGoals: [],
      supportiveGoals: [],
      todayFocus: {
        actions: [],
        dataFreshness: {
          weightDataNeedsRefresh: latestWeight == null,
          checkInNeedsCompletion: false,
          latestWeightAt: null,
        },
      },
    };
  }

  @Get(':id/intelligence')
  async intelligence(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));

    try {
      const result = await this.healthGoalIntelligence.getWeightGoalIntelligence(goal.id);
      const intelligence =
        result && typeof result === 'object' && 'intelligence' in result
          ? (result as any).intelligence
          : result;

      // A defensive controller boundary keeps a partial intelligence failure
      // from turning Today into a 500. The BMI snapshot is calculated only
      // from the current patient/baseline data and the latest weight event.
      if (
        intelligence?.profile?.currentBmi != null &&
        intelligence?.profile?.heightCm != null
      ) {
        return result;
      }

      const fallback = await this.buildWeightIntelligenceFallback(goal.id);
      return {
        ...(result && typeof result === 'object' && !Array.isArray(result) ? result : {}),
        success: true,
        statusCode: 200,
        intelligence: {
          ...intelligence,
          ...fallback,
          profile: {
            ...(intelligence?.profile ?? {}),
            ...fallback.profile,
          },
          weight: {
            ...(intelligence?.weight ?? {}),
            ...fallback.weight,
          },
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ WEIGHT INTELLIGENCE CONTROLLER FALLBACK:', message);

      const fallback = await this.buildWeightIntelligenceFallback(goal.id);
      return {
        success: true,
        statusCode: 200,
        intelligence: fallback,
      };
    }
  }

  @Patch(':id/metric-config')
  async configureMetric(@Param('id') id: string, @Body() config: { metricType?: string; metricKey?: string; frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL'; frequencyTarget?: number | null; guidanceText?: string | null; aggregation?: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX'; comparison?: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO'; }, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));
    if (String(goal.category).toUpperCase() === 'SMOKING') {
      await this.prisma.healthGoalProgress.deleteMany({ where: { healthGoalId: id } });
      await this.prisma.healthGoal.update({ where: { id }, data: { status: 'ACTIVE', achievedAt: null, currentValue: null } });
      config = { ...config, metricType: 'SMOKING', metricKey: 'smoking.cigarettes', frequency: 'DAILY', aggregation: 'LATEST', comparison: 'AT_MOST' };
    }
    return this.healthGoalsService.configureMetric(id, config);
  }

  @Post(':id/smoking-log')
  async logSmoking(@Param('id') id: string, @Body() body: { cigarettes?: number; dayKey?: string }, @Req() request: AuthenticatedRequest) {
    const userId = this.userId(request);
    const goal = await this.assertOwnGoal(id, userId);
    if (String(goal.category).toUpperCase() !== 'SMOKING') throw new BadRequestException('This health goal is not a smoking goal.');
    const cigarettes = Number(body?.cigarettes);
    if (!Number.isFinite(cigarettes) || cigarettes < 0) throw new BadRequestException('Cigarettes must be a number greater than or equal to 0.');
    const dayKey = String(body?.dayKey ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) throw new BadRequestException('A valid local day is required for a smoking log.');

    await this.ensureMetricEventStorage();
    const metricResult = await this.healthGoalsService.syncMetricEventForUser(userId, { metricType: 'SMOKING', metricKey: 'smoking.cigarettes', loggedValue: cigarettes, source: 'patient-smoking-log', sourceId: `${id}:${dayKey}` });

    const journalTitle = `Smoking log · ${dayKey}`;
    const journalText = `Smoking log for ${dayKey}: ${cigarettes} ${cigarettes === 1 ? 'cigarette' : 'cigarettes'} smoked.`;
    try {
      const existingJournal = await this.prisma.healthJournal.findFirst({ where: { patientId: goal.patientId, title: journalTitle }, select: { id: true } });
      if (existingJournal) await this.prisma.healthJournal.update({ where: { id: existingJournal.id }, data: { journal: journalText, notes: 'Recorded from the Smoking health-goal card.' } });
      else await this.prisma.healthJournal.create({ data: { patientId: goal.patientId, title: journalTitle, journal: journalText, notes: 'Recorded from the Smoking health-goal card.' } });
    } catch {
      // The metric event is the authoritative Today-goal record; journal projection must not make saving fail.
    }

    return { metricResult, journal: { title: journalTitle, dayKey, cigarettes } };
  }

  @Post(':id/alcohol-log')
  async logAlcohol(@Param('id') id: string, @Body() body: { drinks?: number }, @Req() request: AuthenticatedRequest) {
    const userId = this.userId(request);
    const goal = await this.assertOwnGoal(id, userId);
    if (String(goal.category).toUpperCase() !== 'ALCOHOL') throw new BadRequestException('This health goal is not an alcohol goal.');

    const drinks = Number(body?.drinks);
    if (!Number.isFinite(drinks) || drinks <= 0) throw new BadRequestException('Drinks must be a number greater than 0.');

    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);
    const localDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = localDate.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    localDate.setUTCDate(localDate.getUTCDate() - daysFromMonday);
    const weekKey = localDate.toISOString().slice(0, 10);
    const source = 'patient-alcohol-log';
    const sourceId = `${id}:${weekKey}`;

    await this.ensureMetricEventStorage();
    const existing = await this.prisma.$queryRaw<Array<{ loggedValue: any }>>`
      SELECT "loggedValue"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${goal.patientId}
        AND "metricType" = 'ALCOHOL'
        AND "metricKey" = 'alcohol.drinks'
        AND "source" = ${source}
        AND "sourceId" = ${sourceId}
      LIMIT 1
    `;
    const previousTotal = existing.length ? Number(existing[0].loggedValue) : 0;
    const weeklyTotal = Number((Math.max(0, previousTotal) + drinks).toFixed(2));

    const metricResult = await this.healthGoalsService.syncMetricEventForUser(userId, {
      metricType: 'ALCOHOL',
      metricKey: 'alcohol.drinks',
      loggedValue: weeklyTotal,
      source,
      sourceId,
      occurredAt: now,
      metadata: { weekKey },
    });

    const journalTitle = `Alcohol log · ${weekKey}`;
    const journalText = `Alcohol log for week starting ${weekKey}: ${weeklyTotal} drink${weeklyTotal === 1 ? '' : 's'} recorded.`;
    let journalUpdated = false;
    try {
      const existingJournal = await this.prisma.healthJournal.findFirst({
        where: { patientId: goal.patientId, title: journalTitle },
        select: { id: true },
      });
      if (existingJournal) {
        await this.prisma.healthJournal.update({
          where: { id: existingJournal.id },
          data: { journal: journalText, notes: 'Recorded from the Alcohol Moderation health-goal card.' },
        });
      } else {
        await this.prisma.healthJournal.create({
          data: { patientId: goal.patientId, title: journalTitle, journal: journalText, notes: 'Recorded from the Alcohol Moderation health-goal card.' },
        });
      }
      journalUpdated = true;
    } catch {
      journalUpdated = false;
    }

    return { metricResult, journal: { updated: journalUpdated, title: journalTitle, weekKey, weeklyTotal } };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));
    await this.prisma.$transaction(async (tx) => {
      await tx.healthGoalProgress.deleteMany({ where: { healthGoalId: goal.id } });
      await tx.$executeRaw`DELETE FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goal.id}`;
      await tx.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${goal.patientId} AND "source" = 'goal-baseline' AND "sourceId" = ${goal.id}`;
      await tx.healthGoal.delete({ where: { id: goal.id } });
    });
    await this.healthGoalIntelligence.syncGoalRelations(goal.patientId);
    return { message: 'Health goal deleted successfully.' };
  }
}
