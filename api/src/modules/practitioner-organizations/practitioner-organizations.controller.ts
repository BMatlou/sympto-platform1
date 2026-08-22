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

import { PractitionerOrganizationsService } from './practitioner-organizations.service';

import { CreatePractitionerOrganizationDto } from './dto/create-practitioner-organization.dto';
import { UpdatePractitionerOrganizationDto } from './dto/update-practitioner-organization.dto';
import { QueryPractitionerOrganizationDto } from './dto/query-practitioner-organization.dto';

@ApiTags('Practitioner Organizations')
@ApiBearerAuth()
@Controller('practitioner-organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PractitionerOrganizationsController {
  constructor(
    private readonly practitionerOrganizationsService: PractitionerOrganizationsService,
  ) {}

  @Permissions('practitioner-organization.create')
  @Post()
  create(
    @Body() dto: CreatePractitionerOrganizationDto,
  ) {
    return this.practitionerOrganizationsService.create(dto);
  }

  @Permissions('practitioner-organization.read')
  @Get()
  findAll(
    @Query() query: QueryPractitionerOrganizationDto,
  ) {
    return this.practitionerOrganizationsService.findAll(query);
  }

  @Permissions('practitioner-organization.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.practitionerOrganizationsService.findOne(id);
  }

  @Permissions('practitioner-organization.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerOrganizationDto,
  ) {
    return this.practitionerOrganizationsService.update(id, dto);
  }

  @Permissions('practitioner-organization.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.practitionerOrganizationsService.remove(id);
  }
}