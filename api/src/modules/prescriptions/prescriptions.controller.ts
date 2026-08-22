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

import { PrescriptionsService } from './prescriptions.service';

import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
  ) {}

  @Permissions('prescriptions.create')
  @Post()
  create(
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(dto);
  }

  @Permissions('prescriptions.read')
  @Get()
  findAll(
    @Query() query: QueryPrescriptionDto,
  ) {
    return this.prescriptionsService.findAll(query);
  }

  @Permissions('prescriptions.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.findOne(id);
  }

  @Permissions('prescriptions.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.update(id, dto);
  }

  @Permissions('prescriptions.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.remove(id);
  }
}