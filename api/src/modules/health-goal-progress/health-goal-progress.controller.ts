import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { HealthGoalProgressService } from './health-goal-progress.service';

import { CreateHealthGoalProgressDto } from './dto/create-health-goal-progress.dto';
import { UpdateHealthGoalProgressDto } from './dto/update-health-goal-progress.dto';
import { QueryHealthGoalProgressDto } from './dto/query-health-goal-progress.dto';

@ApiTags('Health Goal Progress')
@ApiBearerAuth()
@Controller(
  'health-goal-progress',
)
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class HealthGoalProgressController {
  constructor(
    private readonly healthGoalProgressService: HealthGoalProgressService,
  ) {}

  @Permissions(
    'health-goal-progress.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateHealthGoalProgressDto,
  ) {
    return this.healthGoalProgressService.create(
      dto,
    );
  }

  @Permissions(
    'health-goal-progress.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryHealthGoalProgressDto,
  ) {
    return this.healthGoalProgressService.findAll(
      query,
    );
  }

  @Permissions(
    'health-goal-progress.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.healthGoalProgressService.findOne(
      id,
    );
  }

  @Permissions(
    'health-goal-progress.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateHealthGoalProgressDto,
  ) {
    return this.healthGoalProgressService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'health-goal-progress.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.healthGoalProgressService.remove(
      id,
    );
  }
}