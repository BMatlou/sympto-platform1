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

import { AIDifferentialDiagnosesService } from './ai-differential-diagnoses.service';

import { CreateAIDifferentialDiagnosisDto } from './dto/create-ai-differential-diagnosis.dto';
import { UpdateAIDifferentialDiagnosisDto } from './dto/update-ai-differential-diagnosis.dto';
import { QueryAIDifferentialDiagnosisDto } from './dto/query-ai-differential-diagnosis.dto';

@ApiTags('Ai Differential Diagnoses')
@ApiBearerAuth()
@Controller('ai-differential-diagnoses')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AIDifferentialDiagnosesController {
  constructor(
    private readonly aiDifferentialDiagnosesService: AIDifferentialDiagnosesService,
  ) {}

  @Permissions('ai-differential-diagnosis.create')
  @Post()
  create(
    @Body()
    dto: CreateAIDifferentialDiagnosisDto,
  ) {
    return this.aiDifferentialDiagnosesService.create(dto);
  }

  @Permissions('ai-differential-diagnosis.read')
  @Get()
  findAll(
    @Query()
    query: QueryAIDifferentialDiagnosisDto,
  ) {
    return this.aiDifferentialDiagnosesService.findAll(query);
  }

  @Permissions('ai-differential-diagnosis.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.aiDifferentialDiagnosesService.findOne(id);
  }

  @Permissions('ai-differential-diagnosis.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAIDifferentialDiagnosisDto,
  ) {
    return this.aiDifferentialDiagnosesService.update(
      id,
      dto,
    );
  }

  @Permissions('ai-differential-diagnosis.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.aiDifferentialDiagnosesService.remove(id);
  }
}