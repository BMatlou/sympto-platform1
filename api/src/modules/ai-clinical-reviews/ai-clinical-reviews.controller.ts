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

import { AIClinicalReviewsService } from './ai-clinical-reviews.service';

import { CreateAIClinicalReviewDto } from './dto/create-ai-clinical-review.dto';
import { UpdateAIClinicalReviewDto } from './dto/update-ai-clinical-review.dto';
import { QueryAIClinicalReviewDto } from './dto/query-ai-clinical-review.dto';

@ApiTags('Ai Clinical Reviews')
@ApiBearerAuth()
@Controller('ai-clinical-reviews')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIClinicalReviewsController {
  constructor(
    private readonly aiClinicalReviewsService: AIClinicalReviewsService,
  ) {}

  @Permissions('ai-clinical-review.create')
  @Post()
  create(
    @Body()
    dto: CreateAIClinicalReviewDto,
  ) {
    return this.aiClinicalReviewsService.create(dto);
  }

  @Permissions('ai-clinical-review.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIClinicalReviewDto,
  ) {
    return this.aiClinicalReviewsService.findAll(query);
  }

  @Permissions('ai-clinical-review.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiClinicalReviewsService.findOne(id);
  }

  @Permissions('ai-clinical-review.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIClinicalReviewDto,
  ) {
    return this.aiClinicalReviewsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-clinical-review.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiClinicalReviewsService.remove(id);
  }
}