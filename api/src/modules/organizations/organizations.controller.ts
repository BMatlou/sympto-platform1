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

import { OrganizationsService } from './organizations.service';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Permissions('organization.create')
  @Post()
  create(
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(dto);
  }

  @Permissions('organization.read')
  @Get()
  findAll(
    @Query() query: QueryOrganizationDto,
  ) {
    return this.organizationsService.findAll(query);
  }

  @Permissions('organization.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.organizationsService.findOne(id);
  }

  @Permissions('organization.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(
      id,
      dto,
    );
  }

  @Permissions('organization.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.organizationsService.remove(id);
  }
}