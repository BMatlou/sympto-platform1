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

import { PatientBaselinesService } from './patient-baselines.service';

import { CreatePatientBaselineDto } from './dto/create-patient-baseline.dto';
import { UpdatePatientBaselineDto } from './dto/update-patient-baseline.dto';
import { QueryPatientBaselineDto } from './dto/query-patient-baseline.dto';

@ApiTags('Patient Baselines')
@ApiBearerAuth()
@Controller('patient-baselines')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PatientBaselinesController {
  constructor(
    private readonly patientBaselinesService: PatientBaselinesService,
  ) {}

  @Permissions(
    'patient-baselines.create',
  )
  @Post()
  create(
    @Body()
    dto: CreatePatientBaselineDto,
  ) {
    return this.patientBaselinesService.create(
      dto,
    );
  }

  @Permissions(
    'patient-baselines.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryPatientBaselineDto,
  ) {
    return this.patientBaselinesService.findAll(
      query,
    );
  }

  @Permissions(
    'patient-baselines.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.patientBaselinesService.findOne(
      id,
    );
  }

  @Permissions(
    'patient-baselines.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePatientBaselineDto,
  ) {
    return this.patientBaselinesService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'patient-baselines.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.patientBaselinesService.remove(
      id,
    );
  }
}