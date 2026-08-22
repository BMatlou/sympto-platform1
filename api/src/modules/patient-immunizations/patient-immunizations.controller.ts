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

import { PatientImmunizationsService } from './patient-immunizations.service';

import { CreatePatientImmunizationDto } from './dto/create-patient-immunization.dto';
import { UpdatePatientImmunizationDto } from './dto/update-patient-immunization.dto';
import { QueryPatientImmunizationDto } from './dto/query-patient-immunization.dto';

@ApiTags('Patient Immunizations')
@ApiBearerAuth()
@Controller('patient-immunizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientImmunizationsController {
  constructor(
    private readonly patientImmunizationsService: PatientImmunizationsService,
  ) {}

  @Permissions('patient-immunization.create')
  @Post()
  create(@Body() dto: CreatePatientImmunizationDto) {
    return this.patientImmunizationsService.create(dto);
  }

  @Permissions('patient-immunization.read')
  @Get()
  findAll(@Query() query: QueryPatientImmunizationDto) {
    return this.patientImmunizationsService.findAll(query);
  }

  @Permissions('patient-immunization.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientImmunizationsService.findOne(id);
  }

  @Permissions('patient-immunization.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientImmunizationDto,
  ) {
    return this.patientImmunizationsService.update(id, dto);
  }

  @Permissions('patient-immunization.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientImmunizationsService.remove(id);
  }
}