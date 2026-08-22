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

import { CarePlanGoalsService } from './care-plan-goals.service';

import { CreateCarePlanGoalDto } from './dto/create-care-plan-goal.dto';
import { UpdateCarePlanGoalDto } from './dto/update-care-plan-goal.dto';
import { QueryCarePlanGoalDto } from './dto/query-care-plan-goal.dto';

@ApiTags('Care Plan Goals')
@ApiBearerAuth()
@Controller('care-plan-goals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CarePlanGoalsController {
  constructor(
    private readonly carePlanGoalsService: CarePlanGoalsService,
  ) {}

  @Permissions('careplans.create')
  @Post()
  create(
    @Body() dto: CreateCarePlanGoalDto,
  ) {
    return this.carePlanGoalsService.create(dto);
  }

  @Permissions('careplans.read')
  @Get()
  findAll(
    @Query() query: QueryCarePlanGoalDto,
  ) {
    return this.carePlanGoalsService.findAll(query);
  }

  @Permissions('careplans.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.carePlanGoalsService.findOne(id);
  }

  @Permissions('careplans.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanGoalDto,
  ) {
    return this.carePlanGoalsService.update(id, dto);
  }

  @Permissions('careplans.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.carePlanGoalsService.remove(id);
  }
}