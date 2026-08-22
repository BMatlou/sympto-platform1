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

import { AISymptomsService } from './ai-symptoms.service';

import { CreateAISymptomDto } from './dto/create-ai-symptom.dto';
import { UpdateAISymptomDto } from './dto/update-ai-symptom.dto';
import { QueryAISymptomDto } from './dto/query-ai-symptom.dto';

@ApiTags('Ai Symptoms')
@ApiBearerAuth()
@Controller('ai-symptoms')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AISymptomsController {
  constructor(
    private readonly aiSymptomsService: AISymptomsService,
  ) {}

  @Permissions('ai-symptom.create')
  @Post()
  create(
    @Body()
    dto: CreateAISymptomDto,
  ) {
    return this.aiSymptomsService.create(dto);
  }

  @Permissions('ai-symptom.read')
  @Get()
  findAll(
    @Query()
    query: QueryAISymptomDto,
  ) {
    return this.aiSymptomsService.findAll(query);
  }

  @Permissions('ai-symptom.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiSymptomsService.findOne(id);
  }

  @Permissions('ai-symptom.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAISymptomDto,
  ) {
    return this.aiSymptomsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-symptom.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiSymptomsService.remove(id);
  }
}