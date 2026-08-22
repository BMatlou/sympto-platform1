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

import { ClinicalNotesService } from './clinical-notes.service';

import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';
import { QueryClinicalNoteDto } from './dto/query-clinical-note.dto';

@ApiTags('Clinical Notes')
@ApiBearerAuth()
@Controller('clinical-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClinicalNotesController {
  constructor(
    private readonly clinicalNotesService: ClinicalNotesService,
  ) {}

  @Permissions('clinical-notes.create')
  @Post()
  create(
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.create(dto);
  }

  @Permissions('clinical-notes.read')
  @Get()
  findAll(
    @Query() query: QueryClinicalNoteDto,
  ) {
    return this.clinicalNotesService.findAll(query);
  }

  @Permissions('clinical-notes.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.clinicalNotesService.findOne(id);
  }

  @Permissions('clinical-notes.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.clinicalNotesService.update(id, dto);
  }

  @Permissions('clinical-notes.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.clinicalNotesService.remove(id);
  }
}