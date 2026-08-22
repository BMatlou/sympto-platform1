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

import { PractitionerSpecialtiesService } from './practitioner-specialties.service';

import { CreatePractitionerSpecialtyDto } from './dto/create-practitioner-specialty.dto';
import { UpdatePractitionerSpecialtyDto } from './dto/update-practitioner-specialty.dto';
import { QueryPractitionerSpecialtyDto } from './dto/query-practitioner-specialty.dto';

@ApiTags('Practitioner Specialties')
@ApiBearerAuth()
@Controller('practitioner-specialties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PractitionerSpecialtiesController {
  constructor(
    private readonly practitionerSpecialtiesService: PractitionerSpecialtiesService,
  ) {}

  @Permissions('practitioner-specialty.create')
  @Post()
  create(@Body() dto: CreatePractitionerSpecialtyDto) {
    return this.practitionerSpecialtiesService.create(dto);
  }

  @Permissions('practitioner-specialty.read')
  @Get()
  findAll(@Query() query: QueryPractitionerSpecialtyDto) {
    return this.practitionerSpecialtiesService.findAll(query);
  }

  @Permissions('practitioner-specialty.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionerSpecialtiesService.findOne(id);
  }

  @Permissions('practitioner-specialty.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerSpecialtyDto,
  ) {
    return this.practitionerSpecialtiesService.update(id, dto);
  }

  @Permissions('practitioner-specialty.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practitionerSpecialtiesService.remove(id);
  }
}