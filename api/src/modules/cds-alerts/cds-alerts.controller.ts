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

import { CdsAlertsService } from './cds-alerts.service';

import { CreateCdsAlertDto } from './dto/create-cds-alert.dto';
import { UpdateCdsAlertDto } from './dto/update-cds-alert.dto';
import { QueryCdsAlertDto } from './dto/query-cds-alert.dto';

@ApiTags('Cds Alerts')
@ApiBearerAuth()
@Controller('cds-alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CdsAlertsController {
  constructor(
    private readonly cdsAlertsService: CdsAlertsService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(@Body() dto: CreateCdsAlertDto) {
    return this.cdsAlertsService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(@Query() query: QueryCdsAlertDto) {
    return this.cdsAlertsService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cdsAlertsService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCdsAlertDto,
  ) {
    return this.cdsAlertsService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cdsAlertsService.remove(id);
  }
}