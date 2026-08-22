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

import { PatientsService } from './patients.service';

import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * Create Patient
   */
  @Permissions('patients.create')
  @Post()
  create(
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(dto);
  }

  /**
   * List Patients
   * Supports pagination & searching.
   */
  @Permissions('patients.read')
  @Get()
  findAll(
    @Query() query: QueryPatientDto,
  ) {
    return this.patientsService.findAll(query);
  }

  /**
   * Enterprise Patient Profile
   *
   * This is the primary endpoint used by:
   * - Patient Mobile App
   * - Practitioner Dashboard
   * - AI Engine
   * - Wearable Integrations
   * - Family Health
   */
  @Permissions('patients.read')
  @Get(':id/profile')
  getProfile(
    @Param('id') id: string,
  ) {
    return this.patientsService.getProfile(id);
  }

  /**
   * Get Patient
   */
  @Permissions('patients.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.patientsService.findOne(id);
  }

  /**
   * Update Patient
   */
  @Permissions('patients.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(
      id,
      dto,
    );
  }

  /**
   * Delete Patient
   */
  @Permissions('patients.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.patientsService.remove(id);
  }
}