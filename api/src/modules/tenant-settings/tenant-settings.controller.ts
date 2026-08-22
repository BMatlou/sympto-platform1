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

import { TenantSettingsService } from './tenant-settings.service';

import { CreateTenantSettingDto } from './dto/create-tenant-setting.dto';
import { UpdateTenantSettingDto } from './dto/update-tenant-setting.dto';
import { QueryTenantSettingDto } from './dto/query-tenant-setting.dto';

@ApiTags('Tenant Settings')
@ApiBearerAuth()
@Controller('tenant-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantSettingsController {
  constructor(
    private readonly tenantSettingsService: TenantSettingsService,
  ) {}

  @Permissions('tenant-setting.create')
  @Post()
  create(
    @Body() dto: CreateTenantSettingDto,
  ) {
    return this.tenantSettingsService.create(
      dto,
    );
  }

  @Permissions('tenant-setting.read')
  @Get()
  findAll(
    @Query() query: QueryTenantSettingDto,
  ) {
    return this.tenantSettingsService.findAll(
      query,
    );
  }

  @Permissions('tenant-setting.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.tenantSettingsService.findOne(
      id,
    );
  }

  @Permissions('tenant-setting.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantSettingDto,
  ) {
    return this.tenantSettingsService.update(
      id,
      dto,
    );
  }

  @Permissions('tenant-setting.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.tenantSettingsService.remove(
      id,
    );
  }
}