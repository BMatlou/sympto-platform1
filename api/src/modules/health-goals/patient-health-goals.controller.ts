import { BadRequestException, Body, Controller, Delete, ForbiddenException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthGoalsService } from './health-goals.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';

type AuthenticatedRequest = { user?: { sub?: string; id?: string; userId?: string } };

@Controller('patient-health-goals')
@UseGuards(JwtAuthGuard)
export class PatientHealthGoalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalsService: HealthGoalsService,
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
    return this.healthGoalsService.findOne(goal.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    const existing = await this.assertOwnGoal(id, this.userId(request));
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
    return this.healthGoalsService.findOne(updated.id);
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

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const goal = await this.assertOwnGoal(id, this.userId(request));
    await this.prisma.healthGoal.update({ where: { id: goal.id }, data: { status: 'CANCELLED', achievedAt: null } });
    return { message: 'Health goal removed successfully.' };
  }
}
