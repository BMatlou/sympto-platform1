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

import { LabDisciplinesService } from './lab-disciplines.service';

import { CreateLabDisciplineDto } from './dto/create-lab-discipline.dto';
import { UpdateLabDisciplineDto } from './dto/update-lab-discipline.dto';
import { QueryLabDisciplineDto } from './dto/query-lab-discipline.dto';

@ApiTags('Lab Disciplines')
@ApiBearerAuth()
@Controller('lab-disciplines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabDisciplinesController {
  constructor(
    private readonly labDisciplinesService: LabDisciplinesService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabDisciplineDto,
  ) {
    return this.labDisciplinesService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabDisciplineDto,
  ) {
    return this.labDisciplinesService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labDisciplinesService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabDisciplineDto,
  ) {
    return this.labDisciplinesService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labDisciplinesService.remove(id);
  }
}