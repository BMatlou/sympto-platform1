import { Body, Controller, Delete, Patch, Post, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthGoalsService } from './health-goals.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';

type AuthenticatedRequest = { user?: { sub?: string; id?: string } };

@Controller('patient-health-goals')
@UseGuards(JwtAuthGuard)
export class PatientHealthGoalsController {
  constructor(private readonly healthGoalsService: HealthGoalsService) {}

  private userId(request: AuthenticatedRequest) {
    return request.user?.sub ?? request.user?.id ?? '';
  }

  private async assertOwnGoal(goalId: string, userId: string) {
    const goal = await this.healthGoalsService.findOne(goalId);
    if (!userId || goal.patient.userId !== userId) {
      throw new Error('Patient health goal does not belong to the authenticated user.');
    }
    return goal;
  }

  @Post()
  async create(@Body() dto: CreateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    const userId = this.userId(request);
    const patient = await this.healthGoalsService.findPatientForUser(userId);
    if (!patient || patient.id !== dto.patientId) {
      throw new Error('Patient health goal does not belong to the authenticated user.');
    }
    return this.healthGoalsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHealthGoalDto, @Req() request: AuthenticatedRequest) {
    await this.assertOwnGoal(id, this.userId(request));
    return this.healthGoalsService.update(id, dto);
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
    return this.healthGoalsService.remove(id);
  }
}
