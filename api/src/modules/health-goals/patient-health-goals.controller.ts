import { BadRequestException, Body, Controller, Delete, ForbiddenException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthGoalsService } from './health-goals.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';

type AuthenticatedRequest = { user?: { sub?: string; id?: string } };

@Controller('patient-health-goals')
@UseGuards(JwtAuthGuard)
export class PatientHealthGoalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  private userId(request: AuthenticatedRequest) {
    return request.user?.sub ?? request.user?.id ?? '';
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

    const {
      metricType,
      metricKey,
      frequency,
      frequencyTarget,
      aggregation,
      comparison,
      guidanceText,
      patientId,
      targetDate,
      achievedAt,
      ...goalData
    } = dto;

    const parsedTargetDate = targetDate ? new Date(targetDate) : undefined;
    const parsedAchievedAt = achievedAt ? new Date(achievedAt) : undefined;
    if (parsedTargetDate && Number.isNaN(parsedTargetDate.getTime())) throw new BadRequestException('Target date is invalid.');
    if (parsedAchievedAt && Number.isNaN(parsedAchievedAt.getTime())) throw new BadRequestException('Achievement date is invalid.');

    const goal = await this.prisma.healthGoal.create({
      data: { ...goalData, patientId, targetDate: parsedTargetDate, achievedAt: parsedAchievedAt },
      include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } },
    });

    await this.healthGoalsService.configureMetric(goal.id, {
      metricType,
      metricKey,
      frequency,
      frequencyTarget: frequencyTarget == null ? undefined : Number(frequencyTarget),
      aggregation,
      comparison,
      guidanceText,
    });

    return this.healthGoalsService.findOne(goal.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    const existing = await this.assertOwnGoal(id, this.userId(request));
    const {
      patientId,
      metricType,
      metricKey,
      frequency,
      frequencyTarget,
      aggregation,
      comparison,
      guidanceText,
      targetDate,
      achievedAt,
      ...goalData
    } = dto;

    const parsedTargetDate = targetDate ? new Date(targetDate) : undefined;
    const parsedAchievedAt = achievedAt ? new Date(achievedAt) : undefined;
    if (parsedTargetDate && Number.isNaN(parsedTargetDate.getTime())) throw new BadRequestException('Target date is invalid.');
    if (parsedAchievedAt && Number.isNaN(parsedAchievedAt.getTime())) throw new BadRequestException('Achievement date is invalid.');

    const updated = await this.prisma.healthGoal.update({
      where: { id },
      data: {
        ...goalData,
        ...(patientId !== undefined ? {} : {}),
        ...(targetDate !== undefined ? { targetDate: parsedTargetDate } : {}),
        ...(achievedAt !== undefined ? { achievedAt: parsedAchievedAt } : {}),
      },
      include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } },
    });

    if (metricType || metricKey || frequency || frequencyTarget !== undefined || aggregation || comparison || guidanceText !== undefined) {
      await this.healthGoalsService.configureMetric(id, {
        metricType,
        metricKey,
        frequency,
        frequencyTarget: frequencyTarget == null ? undefined : Number(frequencyTarget),
        aggregation,
        comparison,
        guidanceText,
      });
    }

    return this.healthGoalsService.findOne(updated.id);
  }

  @Patch(':id/metric-config')
  async configureMetric(@Param('id') id: string, @Body() config: {
    metricType?: string;
    metricKey?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL';
    frequencyTarget?: number | null;
    guidanceText?: string | null;
    aggregation?: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
    comparison?: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
  }, @Req() request: AuthenticatedRequest) {
    await this.assertOwnGoal(id, this.userId(request));
    return this.healthGoalsService.configureMetric(id, config);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.assertOwnGoal(id, this.userId(request));
    await this.prisma.healthGoal.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Health goal removed successfully.' };
  }
}
