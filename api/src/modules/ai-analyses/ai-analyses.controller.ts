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

import { AIAnalysesService } from './ai-analyses.service';

import { CreateAIAnalysisDto } from './dto/create-ai-analysis.dto';
import { UpdateAIAnalysisDto } from './dto/update-ai-analysis.dto';
import { QueryAIAnalysisDto } from './dto/query-ai-analysis.dto';

@ApiTags('Ai Analyses')
@ApiBearerAuth()
@Controller('ai-analyses')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIAnalysesController {
  constructor(
    private readonly aiAnalysesService: AIAnalysesService,
  ) {}

  @Permissions('ai-analysis.create')
  @Post()
  create(
    @Body()
    dto: CreateAIAnalysisDto,
  ) {
    return this.aiAnalysesService.create(dto);
  }

  @Permissions('ai-analysis.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIAnalysisDto,
  ) {
    return this.aiAnalysesService.findAll(query);
  }

  @Permissions('ai-analysis.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiAnalysesService.findOne(id);
  }

  @Permissions('ai-analysis.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIAnalysisDto,
  ) {
    return this.aiAnalysesService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-analysis.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiAnalysesService.remove(id);
  }
}