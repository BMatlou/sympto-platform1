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

import { SecurityIncidentsService } from './security-incidents.service';

import { CreateSecurityIncidentDto } from './dto/create-security-incident.dto';
import { UpdateSecurityIncidentDto } from './dto/update-security-incident.dto';
import { QuerySecurityIncidentDto } from './dto/query-security-incident.dto';

@ApiTags('Security Incidents')
@ApiBearerAuth()
@Controller('security-incidents')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class SecurityIncidentsController {
  constructor(
    private readonly securityIncidentsService: SecurityIncidentsService,
  ) {}

  @Permissions('security-incident.create')
  @Post()
  create(
    @Body()
    dto: CreateSecurityIncidentDto,
  ) {
    return this.securityIncidentsService.create(dto);
  }

  @Permissions('security-incident.read')
  @Get()
  findAll(
    @Query()
    query: QuerySecurityIncidentDto,
  ) {
    return this.securityIncidentsService.findAll(query);
  }

  @Permissions('security-incident.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.securityIncidentsService.findOne(id);
  }

  @Permissions('security-incident.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateSecurityIncidentDto,
  ) {
    return this.securityIncidentsService.update(
      id,
      dto,
    );
  }

  @Permissions('security-incident.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.securityIncidentsService.remove(id);
  }
}