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

import { ApiKeysService } from './api-keys.service';

import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { QueryApiKeyDto } from './dto/query-api-key.dto';

@ApiTags('Api Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
  ) {}

  @Permissions('api-key.create')
  @Post()
  create(
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(dto);
  }

  @Permissions('api-key.read')
  @Get()
  findAll(
    @Query() query: QueryApiKeyDto,
  ) {
    return this.apiKeysService.findAll(query);
  }

  @Permissions('api-key.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.apiKeysService.findOne(id);
  }

  @Permissions('api-key.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(
      id,
      dto,
    );
  }

  @Permissions('api-key.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.apiKeysService.remove(id);
  }
}