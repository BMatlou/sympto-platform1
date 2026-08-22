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

import { PatientAllergiesService } from './patient-allergies.service';

import { CreatePatientAllergyDto } from './dto/create-patient-allergy.dto';
import { UpdatePatientAllergyDto } from './dto/update-patient-allergy.dto';
import { QueryPatientAllergyDto } from './dto/query-patient-allergy.dto';

@ApiTags('Patient Allergies')
@ApiBearerAuth()
@Controller('patient-allergies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientAllergiesController {
  constructor(
    private readonly patientAllergiesService: PatientAllergiesService,
  ) {}

  @Permissions('patient-allergy.create')
  @Post()
  create(@Body() dto: CreatePatientAllergyDto) {
    return this.patientAllergiesService.create(dto);
  }

  @Permissions('patient-allergy.read')
  @Get()
  findAll(@Query() query: QueryPatientAllergyDto) {
    return this.patientAllergiesService.findAll(query);
  }

  @Permissions('patient-allergy.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientAllergiesService.findOne(id);
  }

  @Permissions('patient-allergy.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientAllergyDto,
  ) {
    return this.patientAllergiesService.update(id, dto);
  }

  @Permissions('patient-allergy.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientAllergiesService.remove(id);
  }
}