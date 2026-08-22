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

import { CdsOverridesService } from './cds-overrides.service';

import { CreateCdsOverrideDto } from './dto/create-cds-override.dto';
import { UpdateCdsOverrideDto } from './dto/update-cds-override.dto';
import { QueryCdsOverrideDto } from './dto/query-cds-override.dto';

@ApiTags('Cds Overrides')
@ApiBearerAuth()
@Controller('cds-overrides')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CdsOverridesController {
  constructor(
    private readonly cdsOverridesService: CdsOverridesService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(
    @Body() dto: CreateCdsOverrideDto,
  ) {
    return this.cdsOverridesService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(
    @Query() query: QueryCdsOverrideDto,
  ) {
    return this.cdsOverridesService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.cdsOverridesService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCdsOverrideDto,
  ) {
    return this.cdsOverridesService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.cdsOverridesService.remove(id);
  }
}