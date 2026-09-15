import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
  constructor(private readonly clinicalEpisodesService: ClinicalEpisodesService) {}

  @Permissions('clinical-episodes.create')
  @Post()
  create(@Req() req: any, @Body() dto: CreateClinicalEpisodeDto) {
    return this.clinicalEpisodesService.create(dto, req.user.sub);
  }

  @Permissions('clinical-episodes.read')
  @Get()
  findAll(@Req() req: any, @Query() query: QueryClinicalEpisodeDto) {
    return this.clinicalEpisodesService.findAll(query, req.user.sub);
  }

  @Permissions('clinical-episodes.read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.clinicalEpisodesService.findOne(id, req.user.sub);
  }

  @Permissions('clinical-episodes.update')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateClinicalEpisodeDto) {
    return this.clinicalEpisodesService.update(id, dto, req.user.sub);
  }

  @Permissions('clinical-episodes.delete')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.clinicalEpisodesService.remove(id, req.user.sub);
  }
}
