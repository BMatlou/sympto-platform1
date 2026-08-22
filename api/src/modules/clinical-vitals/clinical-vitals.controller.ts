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

import { ClinicalVitalsService } from './clinical-vitals.service';

import { CreateClinicalVitalDto } from './dto/create-clinical-vital.dto';
import { UpdateClinicalVitalDto } from './dto/update-clinical-vital.dto';
import { QueryClinicalVitalDto } from './dto/query-clinical-vital.dto';

@ApiTags('Clinical Vitals')
@ApiBearerAuth()
@Controller('clinical-vitals')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClinicalVitalsController {
  constructor(
    private readonly clinicalVitalsService: ClinicalVitalsService,
  ) {}

  @Permissions('clinical-vitals.create')
  @Post()
  create(
    @Body() dto: CreateClinicalVitalDto,
  ) {
    return this.clinicalVitalsService.create(dto);
  }

  @Permissions('clinical-vitals.read')
  @Get()
  findAll(
    @Query() query: QueryClinicalVitalDto,
  ) {
    return this.clinicalVitalsService.findAll(query);
  }

  @Permissions('clinical-vitals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.clinicalVitalsService.findOne(id);
  }

  @Permissions('clinical-vitals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalVitalDto,
  ) {
    return this.clinicalVitalsService.update(
      id,
      dto,
    );
  }

  @Permissions('clinical-vitals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.clinicalVitalsService.remove(id);
  }
}