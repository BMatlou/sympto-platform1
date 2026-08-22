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

import { LaboratoryInstrumentsService } from './laboratory-instruments.service';

import { CreateLaboratoryInstrumentDto } from './dto/create-laboratory-instrument.dto';
import { UpdateLaboratoryInstrumentDto } from './dto/update-laboratory-instrument.dto';
import { QueryLaboratoryInstrumentDto } from './dto/query-laboratory-instrument.dto';

@ApiTags('Laboratory Instruments')
@ApiBearerAuth()
@Controller('laboratory-instruments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LaboratoryInstrumentsController {
  constructor(
    private readonly laboratoryInstrumentsService: LaboratoryInstrumentsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLaboratoryInstrumentDto,
  ) {
    return this.laboratoryInstrumentsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLaboratoryInstrumentDto,
  ) {
    return this.laboratoryInstrumentsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.laboratoryInstrumentsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLaboratoryInstrumentDto,
  ) {
    return this.laboratoryInstrumentsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.laboratoryInstrumentsService.remove(id);
  }
}