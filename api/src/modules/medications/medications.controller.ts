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

import { MedicationsService } from './medications.service';

import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { QueryMedicationDto } from './dto/query-medication.dto';

@ApiTags('Medications')
@ApiBearerAuth()
@Controller('medications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MedicationsController {
  constructor(
    private readonly medicationsService: MedicationsService,
  ) {}

  @Permissions('medications.create')
  @Post()
  create(@Body() dto: CreateMedicationDto) {
    return this.medicationsService.create(dto);
  }

  @Permissions('medications.read')
  @Get()
  findAll(@Query() query: QueryMedicationDto) {
    return this.medicationsService.findAll(query);
  }

  @Permissions('medications.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicationsService.findOne(id);
  }

  @Permissions('medications.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(id, dto);
  }

  @Permissions('medications.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicationsService.remove(id);
  }
}