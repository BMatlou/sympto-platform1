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

import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { SyncGoalMetricDto } from './dto/sync-goal-metric.dto';

@ApiTags('Health Goals')
@ApiBearerAuth()
@Controller('health-goals')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class HealthGoalsController {
  constructor(
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  @Permissions('health-goals.read')
  @Get('active-snapshot')
  async activeSnapshot(@Req() req: any) {
    const result = await this.healthGoalsService.getActiveSnapshot(req.user.sub);
    return { data: result };
  }

  @Permissions('health-goals.update')
  @Post('metric-event')
  async syncMetricEvent(
    @Req() req: any,
    @Body() dto: SyncGoalMetricDto,
  ) {
    const patient = await this.healthGoalsService['prisma'].patient.findUnique({
      where: { userId: req.user.sub },
      select: { id: true },
    });

    if (!patient) {
      return { data: { updatedGoals: [] } };
    }

    const result = await this.healthGoalsService.syncMetricEvent(
      patient.id,
      dto,
    );

    return { data: result };
  }

  @Permissions('health-goals.create')
  @Post()
  create(
    @Body()
    dto: CreateHealthGoalDto,
  ) {
    return this.healthGoalsService.create(
      dto,
    );
  }

  @Permissions('health-goals.read')
  @Get()
  findAll(
    @Query()
    query: QueryHealthGoalDto,
  ) {
    return this.healthGoalsService.findAll(
      query,
    );
  }

  @Permissions('health-goals.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateHealthGoalDto,
  ) {
    return this.healthGoalsService.update(
      id,
      dto,
    );
  }

  @Permissions('health-goals.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.healthGoalsService.remove(
      id,
    );
  }

  @Permissions('health-goals.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.healthGoalsService.findOne(
      id,
    );
  }
}
