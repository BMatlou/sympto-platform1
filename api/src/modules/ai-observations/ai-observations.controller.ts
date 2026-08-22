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

import { AIObservationsService } from './ai-observations.service';

import { CreateAIObservationDto } from './dto/create-ai-observation.dto';
import { UpdateAIObservationDto } from './dto/update-ai-observation.dto';
import { QueryAIObservationDto } from './dto/query-ai-observation.dto';

@ApiTags('Ai Observations')
@ApiBearerAuth()
@Controller('ai-observations')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIObservationsController {
  constructor(
    private readonly aiObservationsService: AIObservationsService,
  ) {}

  @Permissions('ai-observations.create')
  @Post()
  create(
    @Body()
    dto: CreateAIObservationDto,
  ) {
    return this.aiObservationsService.create(
      dto,
    );
  }

  @Permissions('ai-observations.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIObservationDto,
  ) {
    return this.aiObservationsService.findAll(
      query,
    );
  }

  @Permissions('ai-observations.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiObservationsService.findOne(
      id,
    );
  }

  @Permissions('ai-observations.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIObservationDto,
  ) {
    return this.aiObservationsService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-observations.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiObservationsService.remove(
      id,
    );
  }
}