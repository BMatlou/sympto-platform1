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

import { AISymptomAssessmentsService } from './ai-symptom-assessments.service';

import { CreateAISymptomAssessmentDto } from './dto/create-ai-symptom-assessment.dto';
import { UpdateAISymptomAssessmentDto } from './dto/update-ai-symptom-assessment.dto';
import { QueryAISymptomAssessmentDto } from './dto/query-ai-symptom-assessment.dto';

@ApiTags('Ai Symptom Assessments')
@ApiBearerAuth()
@Controller('ai-symptom-assessments')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AISymptomAssessmentsController {
  constructor(
    private readonly aiSymptomAssessmentsService: AISymptomAssessmentsService,
  ) {}

  @Permissions('ai-symptom-assessment.create')
  @Post()
  create(
    @Body()
    dto: CreateAISymptomAssessmentDto,
  ) {
    return this.aiSymptomAssessmentsService.create(
      dto,
    );
  }

  @Permissions('ai-symptom-assessment.read')
  @Get()
  findAll(
    @Query()
    query: QueryAISymptomAssessmentDto,
  ) {
    return this.aiSymptomAssessmentsService.findAll(
      query,
    );
  }

  @Permissions('ai-symptom-assessment.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiSymptomAssessmentsService.findOne(
      id,
    );
  }

  @Permissions('ai-symptom-assessment.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAISymptomAssessmentDto,
  ) {
    return this.aiSymptomAssessmentsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-symptom-assessment.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiSymptomAssessmentsService.remove(
      id,
    );
  }
}