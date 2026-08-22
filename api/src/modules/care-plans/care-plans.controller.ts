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

import { CarePlansService } from './care-plans.service';

import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import { QueryCarePlanDto } from './dto/query-care-plan.dto';

@ApiTags('Care Plans')
@ApiBearerAuth()
@Controller('care-plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CarePlansController {
  constructor(
    private readonly carePlansService: CarePlansService,
  ) {}

  @Permissions('careplans.create')
  @Post()
  create(
    @Body() dto: CreateCarePlanDto,
  ) {
    return this.carePlansService.create(dto);
  }

  @Permissions('careplans.read')
  @Get()
  findAll(
    @Query() query: QueryCarePlanDto,
  ) {
    return this.carePlansService.findAll(query);
  }

  @Permissions('careplans.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.carePlansService.findOne(id);
  }

  @Permissions('careplans.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanDto,
  ) {
    return this.carePlansService.update(id, dto);
  }

  @Permissions('careplans.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.carePlansService.remove(id);
  }
}