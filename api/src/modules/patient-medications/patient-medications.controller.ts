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

import { PatientMedicationsService } from './patient-medications.service';

import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';
import { QueryPatientMedicationDto } from './dto/query-patient-medication.dto';

@ApiTags('Patient Medications')
@ApiBearerAuth()
@Controller('patient-medications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientMedicationsController {
  constructor(
    private readonly patientMedicationsService: PatientMedicationsService,
  ) {}

  @Permissions('patient-medication.create')
  @Post()
  create(@Body() dto: CreatePatientMedicationDto) {
    return this.patientMedicationsService.create(dto);
  }

  @Permissions('patient-medication.read')
  @Get()
  findAll(@Query() query: QueryPatientMedicationDto) {
    return this.patientMedicationsService.findAll(query);
  }

  @Permissions('patient-medication.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientMedicationsService.findOne(id);
  }

  @Permissions('patient-medication.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientMedicationDto,
  ) {
    return this.patientMedicationsService.update(id, dto);
  }

  @Permissions('patient-medication.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientMedicationsService.remove(id);
  }
}