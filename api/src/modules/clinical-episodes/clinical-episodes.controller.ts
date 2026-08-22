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

import { ClinicalEpisodesService } from './clinical-episodes.service';

import { CreateClinicalEpisodeDto } from './dto/create-clinical-episode.dto';
import { UpdateClinicalEpisodeDto } from './dto/update-clinical-episode.dto';
import { QueryClinicalEpisodeDto } from './dto/query-clinical-episode.dto';

@ApiTags('Clinical Episodes')
@ApiBearerAuth()
@Controller('clinical-episodes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClinicalEpisodesController {
  constructor(
    private readonly clinicalEpisodesService: ClinicalEpisodesService,
  ) {}

  @Permissions('clinical-episodes.create')
  @Post()
  create(
    @Body() dto: CreateClinicalEpisodeDto,
  ) {
    return this.clinicalEpisodesService.create(dto);
  }

  @Permissions('clinical-episodes.read')
  @Get()
  findAll(
    @Query() query: QueryClinicalEpisodeDto,
  ) {
    return this.clinicalEpisodesService.findAll(query);
  }

  @Permissions('clinical-episodes.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.clinicalEpisodesService.findOne(id);
  }

  @Permissions('clinical-episodes.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalEpisodeDto,
  ) {
    return this.clinicalEpisodesService.update(
      id,
      dto,
    );
  }

  @Permissions('clinical-episodes.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.clinicalEpisodesService.remove(id);
  }
}