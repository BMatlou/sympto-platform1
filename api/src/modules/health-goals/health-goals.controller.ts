import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { HealthGoalsService } from './health-goals.service';
import { GoalMetricActionService } from './goal-metric-action.service';

import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { SyncGoalMetricDto } from './dto/sync-goal-metric.dto';

@ApiTags('Health Goals')
@ApiBearerAuth()
@Controller('health-goals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HealthGoalsController {
  constructor(
    private readonly healthGoalsService: HealthGoalsService,
    private readonly goalMetricActionService: GoalMetricActionService,
  ) {}

  @Permissions('health-goals.read')
  @Get('active-snapshot')
  async activeSnapshot(@Req() req: any) {
    const result = await this.healthGoalsService.getActiveSnapshotForUser(req.user.sub);
    return { data: result };
  }

  // Patients already have health-goals.read; ownership is enforced from req.user.sub
  // inside GoalMetricActionService so a patient can only write their own metric event.
  @Permissions('health-goals.read')
  @Post('metric-event')
  async syncMetricEvent(
    @Req() req: any,
    @Body() dto: SyncGoalMetricDto,
  ) {
    const result = await this.goalMetricActionService.syncForUser(req.user.sub, dto);
    return { data: result };
  }

  @Permissions('health-goals.create')
  @Post()
  create(@Body() dto: CreateHealthGoalDto) {
    return this.healthGoalsService.create(dto);
  }

  @Permissions('health-goals.read')
  @Get()
  findAll(@Query() query: QueryHealthGoalDto) {
    return this.healthGoalsService.findAll(query);
  }

  @Permissions('health-goals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHealthGoalDto,
  ) {
    return this.healthGoalsService.update(id, dto);
  }

  @Permissions('health-goals.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.healthGoalsService.remove(id);
  }

  @Permissions('health-goals.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthGoalsService.findOne(id);
  }
}
