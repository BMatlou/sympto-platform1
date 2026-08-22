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

import { EncounterTypesService } from './encounter-types.service';

import { CreateEncounterTypeDto } from './dto/create-encounter-type.dto';
import { UpdateEncounterTypeDto } from './dto/update-encounter-type.dto';
import { QueryEncounterTypeDto } from './dto/query-encounter-type.dto';

@ApiTags('Encounter Types')
@ApiBearerAuth()
@Controller('encounter-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncounterTypesController {
  constructor(
    private readonly encounterTypesService: EncounterTypesService,
  ) {}

  @Permissions('encounter-type.create')
  @Post()
  create(@Body() dto: CreateEncounterTypeDto) {
    return this.encounterTypesService.create(dto);
  }

  @Permissions('encounter-type.read')
  @Get()
  findAll(@Query() query: QueryEncounterTypeDto) {
    return this.encounterTypesService.findAll(query);
  }

  @Permissions('encounter-type.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.encounterTypesService.findOne(id);
  }

  @Permissions('encounter-type.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEncounterTypeDto,
  ) {
    return this.encounterTypesService.update(id, dto);
  }

  @Permissions('encounter-type.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.encounterTypesService.remove(id);
  }
}