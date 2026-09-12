import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { HealthGoalsService } from './health-goals.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';
import { SyncGoalMetricDto } from './dto/sync-goal-metric.dto';

type AuthenticatedRequest = { user?: { sub?: string; id?: string } };

@ApiTags('Health Goals')
@ApiBearerAuth()
@Controller('health-goals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthGoalsController {
  constructor(private readonly healthGoalsService: HealthGoalsService) {}

  @Permissions('health-goals.create')
  @Post()
  create(@Body() dto: CreateHealthGoalDto) { return this.healthGoalsService.create(dto); }

  @Permissions('health-goals.read')
  @Get('active-snapshot')
  activeSnapshot(@Query('patientId') patientId: string) { return this.healthGoalsService.getActiveSnapshot(patientId); }

  @Permissions('health-goals.read')
  @Get('metric-events')
  metricEvents(
    @Query('metricType') metricType: string,
    @Query('metricKey') metricKey: string,
    @Query('source') source: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = request.user?.sub ?? request.user?.id ?? '';
    return this.healthGoalsService.getMetricEventsForUser(userId, {
      metricType,
      metricKey,
      source,
      from: new Date(from),
      to: new Date(to),
    });
  }

  @Permissions('health-goals.read')
  @Get()
  findAll(@Query() query: QueryHealthGoalDto) { return this.healthGoalsService.findAll(query); }

  @Permissions('health-goals.update')
  @Post('metric-event')
  syncMetricEvent(@Body() dto: SyncGoalMetricDto, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.sub ?? request.user?.id ?? '';
    return this.healthGoalsService.syncMetricEventForUser(userId, {
      metricType: dto.metricType,
      metricKey: dto.metricKey,
      loggedValue: dto.loggedValue,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      source: dto.source,
      sourceId: dto.sourceId,
    });
  }

  @Permissions('health-goals.read')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.healthGoalsService.findOne(id); }

  @Permissions('health-goals.update')
  @Post(':id/progress')
  recordProgress(@Param('id') id: string, @Body() dto: RecordHealthGoalProgressDto) { return this.healthGoalsService.recordProgress(id, dto); }

  @Permissions('health-goals.update')
  @Patch(':id/metric-config')
  configureMetric(@Param('id') id: string, @Body() config: {
    metricType?: string;
    metricKey?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL';
    frequencyTarget?: number | null;
    guidanceText?: string | null;
    aggregation?: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
    comparison?: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
  }) { return this.healthGoalsService.configureMetric(id, config); }

  @Permissions('health-goals.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHealthGoalDto) { return this.healthGoalsService.update(id, dto); }

  @Permissions('health-goals.delete')
  @Delete(':id')
  remove(@Param('id') id: string) { return this.healthGoalsService.remove(id); }
}
