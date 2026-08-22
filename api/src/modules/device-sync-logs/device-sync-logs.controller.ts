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

import { DeviceSyncLogsService } from './device-sync-logs.service';

import { CreateDeviceSyncLogDto } from './dto/create-device-sync-log.dto';
import { QueryDeviceSyncLogDto } from './dto/query-device-sync-log.dto';

@ApiTags('Device Sync Logs')
@ApiBearerAuth()
@Controller('device-sync-logs')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DeviceSyncLogsController {
  constructor(
    private readonly deviceSyncLogsService: DeviceSyncLogsService,
  ) {}

  @Permissions('device-sync-log.create')
  @Post()
  create(
    @Body()
    dto: CreateDeviceSyncLogDto,
  ) {
    return this.deviceSyncLogsService.create(dto);
  }

  @Permissions('device-sync-log.read')
  @Get()
  findAll(
    @Query()
    query: QueryDeviceSyncLogDto,
  ) {
    return this.deviceSyncLogsService.findAll(query);
  }

  @Permissions('device-sync-log.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.deviceSyncLogsService.findOne(id);
  }
}