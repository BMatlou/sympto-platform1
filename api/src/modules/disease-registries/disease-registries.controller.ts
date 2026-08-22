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

import { DiseaseRegistriesService } from './disease-registries.service';

import { CreateDiseaseRegistryDto } from './dto/create-disease-registry.dto';
import { UpdateDiseaseRegistryDto } from './dto/update-disease-registry.dto';
import { QueryDiseaseRegistryDto } from './dto/query-disease-registry.dto';

@ApiTags('Disease Registries')
@ApiBearerAuth()
@Controller('disease-registries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DiseaseRegistriesController {
  constructor(
    private readonly diseaseRegistriesService: DiseaseRegistriesService,
  ) {}

  @Permissions('disease-registry.create')
  @Post()
  create(@Body() dto: CreateDiseaseRegistryDto) {
    return this.diseaseRegistriesService.create(dto);
  }

  @Permissions('disease-registry.read')
  @Get()
  findAll(@Query() query: QueryDiseaseRegistryDto) {
    return this.diseaseRegistriesService.findAll(query);
  }

  @Permissions('disease-registry.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diseaseRegistriesService.findOne(id);
  }

  @Permissions('disease-registry.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiseaseRegistryDto,
  ) {
    return this.diseaseRegistriesService.update(id, dto);
  }

  @Permissions('disease-registry.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diseaseRegistriesService.remove(id);
  }
}