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

import { PatientConditionsService } from './patient-conditions.service';

import { CreatePatientConditionDto } from './dto/create-patient-condition.dto';
import { UpdatePatientConditionDto } from './dto/update-patient-condition.dto';
import { QueryPatientConditionDto } from './dto/query-patient-condition.dto';

@ApiTags('Patient Conditions')
@ApiBearerAuth()
@Controller('patient-conditions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientConditionsController {
  constructor(
    private readonly patientConditionsService: PatientConditionsService,
  ) {}

  @Permissions('patient-condition.create')
  @Post()
  create(@Body() dto: CreatePatientConditionDto) {
    return this.patientConditionsService.create(dto);
  }

  @Permissions('patient-condition.read')
  @Get()
  findAll(@Query() query: QueryPatientConditionDto) {
    return this.patientConditionsService.findAll(query);
  }

  @Permissions('patient-condition.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientConditionsService.findOne(id);
  }

  @Permissions('patient-condition.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientConditionDto,
  ) {
    return this.patientConditionsService.update(id, dto);
  }

  @Permissions('patient-condition.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientConditionsService.remove(id);
  }
}