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

import { PatientDiagnosesService } from './patient-diagnoses.service';

import { CreatePatientDiagnosisDto } from './dto/create-patient-diagnosis.dto';
import { UpdatePatientDiagnosisDto } from './dto/update-patient-diagnosis.dto';
import { QueryPatientDiagnosisDto } from './dto/query-patient-diagnosis.dto';

@ApiTags('Patient Diagnoses')
@ApiBearerAuth()
@Controller('patient-diagnoses')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PatientDiagnosesController {
  constructor(
    private readonly patientDiagnosesService: PatientDiagnosesService,
  ) {}

  @Permissions('patient-diagnoses.create')
  @Post()
  create(
    @Body() dto: CreatePatientDiagnosisDto,
  ) {
    return this.patientDiagnosesService.create(
      dto,
    );
  }

  @Permissions('patient-diagnoses.read')
  @Get()
  findAll(
    @Query() query: QueryPatientDiagnosisDto,
  ) {
    return this.patientDiagnosesService.findAll(
      query,
    );
  }

  @Permissions('patient-diagnoses.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.patientDiagnosesService.findOne(
      id,
    );
  }

  @Permissions('patient-diagnoses.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    dto: UpdatePatientDiagnosisDto,
  ) {
    return this.patientDiagnosesService.update(
      id,
      dto,
    );
  }

  @Permissions('patient-diagnoses.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.patientDiagnosesService.remove(
      id,
    );
  }
}