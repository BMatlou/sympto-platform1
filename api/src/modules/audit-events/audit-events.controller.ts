import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { AuditEventsService } from './audit-events.service';

import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { QueryAuditEventDto } from './dto/query-audit-event.dto';

@ApiTags('Audit Events')
@ApiBearerAuth()
@Controller('audit-events')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AuditEventsController {
  constructor(
    private readonly auditEventsService: AuditEventsService,
  ) {}

  @Permissions('audit-event.create')
  @Post()
  create(
    @Body()
    dto: CreateAuditEventDto,
  ) {
    return this.auditEventsService.create(dto);
  }

  @Permissions('audit-event.read')
  @Get()
  findAll(
    @Query()
    query: QueryAuditEventDto,
  ) {
    return this.auditEventsService.findAll(query);
  }

  @Permissions('audit-event.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.auditEventsService.findOne(id);
  }
}