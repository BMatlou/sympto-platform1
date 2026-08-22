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

import { EncountersService } from './encounters.service';

import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { QueryEncounterDto } from './dto/query-encounter.dto';

@ApiTags('Encounters')
@ApiBearerAuth()
@Controller('encounters')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class EncountersController {
  constructor(
    private readonly encountersService: EncountersService,
  ) {}

  @Permissions('encounters.create')
  @Post()
  create(
    @Body() dto: CreateEncounterDto,
  ) {
    return this.encountersService.create(dto);
  }

  @Permissions('encounters.read')
  @Get()
  findAll(
    @Query() query: QueryEncounterDto,
  ) {
    return this.encountersService.findAll(query);
  }

  @Permissions('encounters.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.encountersService.findOne(id);
  }

  @Permissions('encounters.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
  ) {
    return this.encountersService.update(
      id,
      dto,
    );
  }

  @Permissions('encounters.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.encountersService.remove(id);
  }
}