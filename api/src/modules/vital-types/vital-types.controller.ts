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

import { VitalTypesService } from './vital-types.service';

import { CreateVitalTypeDto } from './dto/create-vital-type.dto';
import { UpdateVitalTypeDto } from './dto/update-vital-type.dto';
import { QueryVitalTypeDto } from './dto/query-vital-type.dto';

@ApiTags('Vital Types')
@ApiBearerAuth()
@Controller('vital-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VitalTypesController {
  constructor(
    private readonly vitalTypesService: VitalTypesService,
  ) {}

  @Permissions('vital-type.create')
  @Post()
  create(@Body() dto: CreateVitalTypeDto) {
    return this.vitalTypesService.create(dto);
  }

  @Permissions('vital-type.read')
  @Get()
  findAll(@Query() query: QueryVitalTypeDto) {
    return this.vitalTypesService.findAll(query);
  }

  @Permissions('vital-type.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vitalTypesService.findOne(id);
  }

  @Permissions('vital-type.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVitalTypeDto,
  ) {
    return this.vitalTypesService.update(id, dto);
  }

  @Permissions('vital-type.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vitalTypesService.remove(id);
  }
}