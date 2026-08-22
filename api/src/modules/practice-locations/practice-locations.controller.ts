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

import { PracticeLocationsService } from './practice-locations.service';

import { CreatePracticeLocationDto } from './dto/create-practice-location.dto';
import { UpdatePracticeLocationDto } from './dto/update-practice-location.dto';
import { QueryPracticeLocationDto } from './dto/query-practice-location.dto';

@ApiTags('Practice Locations')
@ApiBearerAuth()
@Controller('practice-locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PracticeLocationsController {
  constructor(
    private readonly practiceLocationsService: PracticeLocationsService,
  ) {}

  @Permissions('practice-location.create')
  @Post()
  create(@Body() dto: CreatePracticeLocationDto) {
    return this.practiceLocationsService.create(dto);
  }

  @Permissions('practice-location.read')
  @Get()
  findAll(@Query() query: QueryPracticeLocationDto) {
    return this.practiceLocationsService.findAll(query);
  }

  @Permissions('practice-location.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practiceLocationsService.findOne(id);
  }

  @Permissions('practice-location.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePracticeLocationDto,
  ) {
    return this.practiceLocationsService.update(id, dto);
  }

  @Permissions('practice-location.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practiceLocationsService.remove(id);
  }
}