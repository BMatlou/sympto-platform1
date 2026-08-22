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

import { PractitionerQualificationsService } from './practitioner-qualifications.service';

import { CreatePractitionerQualificationDto } from './dto/create-practitioner-qualification.dto';
import { UpdatePractitionerQualificationDto } from './dto/update-practitioner-qualification.dto';
import { QueryPractitionerQualificationDto } from './dto/query-practitioner-qualification.dto';

@ApiTags('Practitioner Qualifications')
@ApiBearerAuth()
@Controller('practitioner-qualifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PractitionerQualificationsController {
  constructor(
    private readonly practitionerQualificationsService: PractitionerQualificationsService,
  ) {}

  @Permissions('practitioner-qualification.create')
  @Post()
  create(@Body() dto: CreatePractitionerQualificationDto) {
    return this.practitionerQualificationsService.create(dto);
  }

  @Permissions('practitioner-qualification.read')
  @Get()
  findAll(@Query() query: QueryPractitionerQualificationDto) {
    return this.practitionerQualificationsService.findAll(query);
  }

  @Permissions('practitioner-qualification.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionerQualificationsService.findOne(id);
  }

  @Permissions('practitioner-qualification.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerQualificationDto,
  ) {
    return this.practitionerQualificationsService.update(id, dto);
  }

  @Permissions('practitioner-qualification.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practitionerQualificationsService.remove(id);
  }
}