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

import { CriticalResultsService } from './critical-results.service';

import { CreateCriticalResultDto } from './dto/create-critical-result.dto';
import { UpdateCriticalResultDto } from './dto/update-critical-result.dto';
import { QueryCriticalResultDto } from './dto/query-critical-result.dto';

@ApiTags('Critical Results')
@ApiBearerAuth()
@Controller('critical-results')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CriticalResultsController {
  constructor(
    private readonly criticalResultsService: CriticalResultsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(@Body() dto: CreateCriticalResultDto) {
    return this.criticalResultsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(@Query() query: QueryCriticalResultDto) {
    return this.criticalResultsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.criticalResultsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCriticalResultDto,
  ) {
    return this.criticalResultsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.criticalResultsService.remove(id);
  }
}