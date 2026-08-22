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

import { CarePlanTasksService } from './care-plan-tasks.service';

import { CreateCarePlanTaskDto } from './dto/create-care-plan-task.dto';
import { UpdateCarePlanTaskDto } from './dto/update-care-plan-task.dto';
import { QueryCarePlanTaskDto } from './dto/query-care-plan-task.dto';

@ApiTags('Care Plan Tasks')
@ApiBearerAuth()
@Controller('care-plan-tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CarePlanTasksController {
  constructor(
    private readonly carePlanTasksService: CarePlanTasksService,
  ) {}

  @Permissions('careplans.create')
  @Post()
  create(
    @Body() dto: CreateCarePlanTaskDto,
  ) {
    return this.carePlanTasksService.create(dto);
  }

  @Permissions('careplans.read')
  @Get()
  findAll(
    @Query() query: QueryCarePlanTaskDto,
  ) {
    return this.carePlanTasksService.findAll(query);
  }

  @Permissions('careplans.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.carePlanTasksService.findOne(id);
  }

  @Permissions('careplans.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanTaskDto,
  ) {
    return this.carePlanTasksService.update(id, dto);
  }

  @Permissions('careplans.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.carePlanTasksService.remove(id);
  }
}