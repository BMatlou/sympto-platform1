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

import { AIRecommendationsService } from './ai-recommendations.service';

import { CreateAIRecommendationDto } from './dto/create-ai-recommendation.dto';
import { UpdateAIRecommendationDto } from './dto/update-ai-recommendation.dto';
import { QueryAIRecommendationDto } from './dto/query-ai-recommendation.dto';

@ApiTags('Ai Recommendations')
@ApiBearerAuth()
@Controller('ai-recommendations')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIRecommendationsController {
  constructor(
    private readonly aiRecommendationsService: AIRecommendationsService,
  ) {}

  @Permissions('ai-recommendation.create')
  @Post()
  create(
    @Body()
    dto: CreateAIRecommendationDto,
  ) {
    return this.aiRecommendationsService.create(dto);
  }

  @Permissions('ai-recommendation.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIRecommendationDto,
  ) {
    return this.aiRecommendationsService.findAll(query);
  }

  @Permissions('ai-recommendation.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiRecommendationsService.findOne(id);
  }

  @Permissions('ai-recommendation.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIRecommendationDto,
  ) {
    return this.aiRecommendationsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-recommendation.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiRecommendationsService.remove(id);
  }
}