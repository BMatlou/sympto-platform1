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

import { DataAccessConsentsService } from './data-access-consents.service';

import { CreateDataAccessConsentDto } from './dto/create-data-access-consent.dto';
import { UpdateDataAccessConsentDto } from './dto/update-data-access-consent.dto';
import { QueryDataAccessConsentDto } from './dto/query-data-access-consent.dto';

@ApiTags('Data Access Consents')
@ApiBearerAuth()
@Controller('data-access-consents')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DataAccessConsentsController {
  constructor(
    private readonly dataAccessConsentsService: DataAccessConsentsService,
  ) {}

  @Permissions('data-access-consent.create')
  @Post()
  create(
    @Body()
    dto: CreateDataAccessConsentDto,
  ) {
    return this.dataAccessConsentsService.create(dto);
  }

  @Permissions('data-access-consent.read')
  @Get()
  findAll(
    @Query()
    query: QueryDataAccessConsentDto,
  ) {
    return this.dataAccessConsentsService.findAll(query);
  }

  @Permissions('data-access-consent.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.dataAccessConsentsService.findOne(id);
  }

  @Permissions('data-access-consent.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateDataAccessConsentDto,
  ) {
    return this.dataAccessConsentsService.update(
      id,
      dto,
    );
  }
}