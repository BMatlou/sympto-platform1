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

import { CarePlanNotesService } from './care-plan-notes.service';

import { CreateCarePlanNoteDto } from './dto/create-care-plan-note.dto';
import { UpdateCarePlanNoteDto } from './dto/update-care-plan-note.dto';
import { QueryCarePlanNoteDto } from './dto/query-care-plan-note.dto';

@ApiTags('Care Plan Notes')
@ApiBearerAuth()
@Controller('care-plan-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CarePlanNotesController {
  constructor(
    private readonly carePlanNotesService: CarePlanNotesService,
  ) {}

  @Permissions('careplans.create')
  @Post()
  create(
    @Body() dto: CreateCarePlanNoteDto,
  ) {
    return this.carePlanNotesService.create(dto);
  }

  @Permissions('careplans.read')
  @Get()
  findAll(
    @Query() query: QueryCarePlanNoteDto,
  ) {
    return this.carePlanNotesService.findAll(query);
  }

  @Permissions('careplans.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.carePlanNotesService.findOne(id);
  }

  @Permissions('careplans.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanNoteDto,
  ) {
    return this.carePlanNotesService.update(id, dto);
  }

  @Permissions('careplans.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.carePlanNotesService.remove(id);
  }
}