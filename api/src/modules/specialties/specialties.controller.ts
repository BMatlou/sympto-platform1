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

import { SpecialtiesService } from './specialties.service';

import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';

@ApiTags('Specialties')
@ApiBearerAuth()
@Controller('specialties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpecialtiesController {
  constructor(
    private readonly specialtiesService: SpecialtiesService,
  ) {}

  @Permissions('specialty.create')
  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto);
  }

  @Permissions('specialty.read')
  @Get()
  findAll(@Query() query: QuerySpecialtyDto) {
    return this.specialtiesService.findAll(query);
  }

  @Permissions('specialty.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Permissions('specialty.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    return this.specialtiesService.update(id, dto);
  }

  @Permissions('specialty.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.specialtiesService.remove(id);
  }
}