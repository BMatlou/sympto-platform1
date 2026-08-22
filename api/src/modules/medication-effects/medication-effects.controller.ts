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

import { MedicationEffectsService } from './medication-effects.service';

import { CreateMedicationEffectDto } from './dto/create-medication-effect.dto';
import { UpdateMedicationEffectDto } from './dto/update-medication-effect.dto';
import { QueryMedicationEffectDto } from './dto/query-medication-effect.dto';

@ApiTags('Medication Effects')
@ApiBearerAuth()
@Controller('medication-effects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationEffectsController {
  constructor(
    private readonly medicationEffectsService: MedicationEffectsService,
  ) {}

  @Permissions('medication-effects.create')
  @Post()
  create(
    @Body()
    dto: CreateMedicationEffectDto,
  ) {
    return this.medicationEffectsService.create(
      dto,
    );
  }

  @Permissions('medication-effects.read')
  @Get()
  findAll(
    @Query()
    query: QueryMedicationEffectDto,
  ) {
    return this.medicationEffectsService.findAll(
      query,
    );
  }

  @Permissions('medication-effects.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.medicationEffectsService.findOne(
      id,
    );
  }

  @Permissions('medication-effects.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateMedicationEffectDto,
  ) {
    return this.medicationEffectsService.update(
      id,
      dto,
    );
  }

  @Permissions('medication-effects.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.medicationEffectsService.remove(
      id,
    );
  }
}