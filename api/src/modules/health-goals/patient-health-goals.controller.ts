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
    const goal = await this.healthGoalsService.findOne(goalId);
    if (!userId || goal.patient.userId !== userId) {
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

  @Get(':id/intelligence')
  async intelligence(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));
    return this.healthGoalIntelligence.getWeightGoalIntelligence(goal.id);
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
