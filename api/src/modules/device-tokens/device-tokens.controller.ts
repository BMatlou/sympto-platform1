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

import { DeviceTokensService } from './device-tokens.service';

import { CreateDeviceTokenDto } from './dto/create-device-token.dto';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';
import { QueryDeviceTokenDto } from './dto/query-device-token.dto';

@ApiTags('Device Tokens')
@ApiBearerAuth()
@Controller('device-tokens')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeviceTokensController {
  constructor(
    private readonly deviceTokensService: DeviceTokensService,
  ) {}

  @Permissions('device-token.create')
  @Post()
  create(
    @Body() dto: CreateDeviceTokenDto,
  ) {
    return this.deviceTokensService.create(
      dto,
    );
  }

  @Permissions('device-token.read')
  @Get()
  findAll(
    @Query() query: QueryDeviceTokenDto,
  ) {
    return this.deviceTokensService.findAll(
      query,
    );
  }

  @Permissions('device-token.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.deviceTokensService.findOne(
      id,
    );
  }

  @Permissions('device-token.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceTokenDto,
  ) {
    return this.deviceTokensService.update(
      id,
      dto,
    );
  }

  @Permissions('device-token.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.deviceTokensService.remove(
      id,
    );
  }
}