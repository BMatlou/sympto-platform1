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

import { PrescriptionItemsService } from './prescription-items.service';

import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';
import { QueryPrescriptionItemDto } from './dto/query-prescription-item.dto';

@ApiTags('Prescription Items')
@ApiBearerAuth()
@Controller('prescription-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrescriptionItemsController {
  constructor(
    private readonly prescriptionItemsService: PrescriptionItemsService,
  ) {}

  @Permissions('prescriptions.create')
  @Post()
  create(
    @Body() dto: CreatePrescriptionItemDto,
  ) {
    return this.prescriptionItemsService.create(dto);
  }

  @Permissions('prescriptions.read')
  @Get()
  findAll(
    @Query() query: QueryPrescriptionItemDto,
  ) {
    return this.prescriptionItemsService.findAll(query);
  }

  @Permissions('prescriptions.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.prescriptionItemsService.findOne(id);
  }

  @Permissions('prescriptions.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionItemDto,
  ) {
    return this.prescriptionItemsService.update(
      id,
      dto,
    );
  }

  @Permissions('prescriptions.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.prescriptionItemsService.remove(id);
  }
}