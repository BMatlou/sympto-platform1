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

import { PatientInsuranceService } from './patient-insurance.service';

import { CreatePatientInsuranceDto } from './dto/create-patient-insurance.dto';
import { UpdatePatientInsuranceDto } from './dto/update-patient-insurance.dto';
import { QueryPatientInsuranceDto } from './dto/query-patient-insurance.dto';

@ApiTags('Patient Insurance')
@ApiBearerAuth()
@Controller('patient-insurance')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PatientInsuranceController {
  constructor(
    private readonly patientInsuranceService: PatientInsuranceService,
  ) {}

  @Permissions('patient-insurance.create')
  @Post()
  create(
    @Body() dto: CreatePatientInsuranceDto,
  ) {
    return this.patientInsuranceService.create(
      dto,
    );
  }

  @Permissions('patient-insurance.read')
  @Get()
  findAll(
    @Query() query: QueryPatientInsuranceDto,
  ) {
    return this.patientInsuranceService.findAll(
      query,
    );
  }

  @Permissions('patient-insurance.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.patientInsuranceService.findOne(
      id,
    );
  }

  @Permissions('patient-insurance.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientInsuranceDto,
  ) {
    return this.patientInsuranceService.update(
      id,
      dto,
    );
  }

  @Permissions('patient-insurance.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.patientInsuranceService.remove(
      id,
    );
  }
}