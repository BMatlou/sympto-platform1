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

import { AIQuestionsService } from './ai-questions.service';

import { CreateAIQuestionDto } from './dto/create-ai-question.dto';
import { UpdateAIQuestionDto } from './dto/update-ai-question.dto';
import { QueryAIQuestionDto } from './dto/query-ai-question.dto';

@ApiTags('Ai Questions')
@ApiBearerAuth()
@Controller('ai-questions')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIQuestionsController {
  constructor(
    private readonly aiQuestionsService: AIQuestionsService,
  ) {}

  @Permissions('ai-question.create')
  @Post()
  create(
    @Body()
    dto: CreateAIQuestionDto,
  ) {
    return this.aiQuestionsService.create(dto);
  }

  @Permissions('ai-question.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIQuestionDto,
  ) {
    return this.aiQuestionsService.findAll(query);
  }

  @Permissions('ai-question.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiQuestionsService.findOne(id);
  }

  @Permissions('ai-question.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIQuestionDto,
  ) {
    return this.aiQuestionsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-question.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiQuestionsService.remove(id);
  }
}