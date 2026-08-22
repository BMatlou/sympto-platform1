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

import { PatientProceduresService } from './patient-procedures.service';

import { CreatePatientProcedureDto } from './dto/create-patient-procedure.dto';
import { UpdatePatientProcedureDto } from './dto/update-patient-procedure.dto';
import { QueryPatientProcedureDto } from './dto/query-patient-procedure.dto';

@ApiTags('Patient Procedures')
@ApiBearerAuth()
@Controller('patient-procedures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientProceduresController {
  constructor(
    private readonly patientProceduresService: PatientProceduresService,
  ) {}

  @Permissions('patient-procedures.create')
  @Post()
  create(
    @Body() dto: CreatePatientProcedureDto,
  ) {
    return this.patientProceduresService.create(dto);
  }

  @Permissions('patient-procedures.read')
  @Get()
  findAll(
    @Query() query: QueryPatientProcedureDto,
  ) {
    return this.patientProceduresService.findAll(query);
  }

  @Permissions('patient-procedures.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.patientProceduresService.findOne(id);
  }

  @Permissions('patient-procedures.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientProcedureDto,
  ) {
    return this.patientProceduresService.update(id, dto);
  }

  @Permissions('patient-procedures.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.patientProceduresService.remove(id);
  }
}