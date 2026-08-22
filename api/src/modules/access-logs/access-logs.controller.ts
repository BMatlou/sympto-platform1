import {
  Body,
  Controller,
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

import { AccessLogsService } from './access-logs.service';

import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { UpdateAccessLogDto } from './dto/update-access-log.dto';
import { QueryAccessLogDto } from './dto/query-access-log.dto';

@ApiTags('Access Logs')
@ApiBearerAuth()
@Controller('access-logs')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AccessLogsController {
  constructor(
    private readonly accessLogsService: AccessLogsService,
  ) {}

  @Permissions('access-log.create')
  @Post()
  create(
    @Body()
    dto: CreateAccessLogDto,
  ) {
    return this.accessLogsService.create(dto);
  }

  @Permissions('access-log.read')
  @Get()
  findAll(
    @Query()
    query: QueryAccessLogDto,
  ) {
    return this.accessLogsService.findAll(query);
  }

  @Permissions('access-log.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.accessLogsService.findOne(id);
  }

  @Permissions('access-log.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAccessLogDto,
  ) {
    return this.accessLogsService.update(
      id,
      dto,
    );
  }
}