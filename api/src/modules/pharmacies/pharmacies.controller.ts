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

import { PharmaciesService } from './pharmacies.service';

import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { QueryPharmacyDto } from './dto/query-pharmacy.dto';

@ApiTags('Pharmacies')
@ApiBearerAuth()
@Controller('pharmacies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PharmaciesController {
  constructor(
    private readonly pharmaciesService: PharmaciesService,
  ) {}

  @Permissions('pharmacy.create')
  @Post()
  create(@Body() dto: CreatePharmacyDto) {
    return this.pharmaciesService.create(dto);
  }

  @Permissions('pharmacy.read')
  @Get()
  findAll(@Query() query: QueryPharmacyDto) {
    return this.pharmaciesService.findAll(query);
  }

  @Permissions('pharmacy.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmaciesService.findOne(id);
  }

  @Permissions('pharmacy.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePharmacyDto,
  ) {
    return this.pharmaciesService.update(id, dto);
  }

  @Permissions('pharmacy.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pharmaciesService.remove(id);
  }
}