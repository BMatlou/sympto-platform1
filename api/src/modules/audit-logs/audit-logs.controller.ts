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

import { AuditLogsService } from './audit-logs.service';

import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Permissions('audit-log.create')
  @Post()
  create(
    @Body()
    dto: CreateAuditLogDto,
  ) {
    return this.auditLogsService.create(dto);
  }

  @Permissions('audit-log.read')
  @Get()
  findAll(
    @Query()
    query: QueryAuditLogDto,
  ) {
    return this.auditLogsService.findAll(query);
  }

  @Permissions('audit-log.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.auditLogsService.findOne(id);
  }
}