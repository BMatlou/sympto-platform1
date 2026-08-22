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

import { RiskAssessmentsService } from './risk-assessments.service';

import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { QueryRiskAssessmentDto } from './dto/query-risk-assessment.dto';

@ApiTags('Risk Assessments')
@ApiBearerAuth()
@Controller('risk-assessments')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class RiskAssessmentsController {
  constructor(
    private readonly riskAssessmentsService: RiskAssessmentsService,
  ) {}

  @Permissions(
    'risk-assessments.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateRiskAssessmentDto,
  ) {
    return this.riskAssessmentsService.create(
      dto,
    );
  }

  @Permissions(
    'risk-assessments.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryRiskAssessmentDto,
  ) {
    return this.riskAssessmentsService.findAll(
      query,
    );
  }

  @Permissions(
    'risk-assessments.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.riskAssessmentsService.findOne(
      id,
    );
  }

  @Permissions(
    'risk-assessments.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateRiskAssessmentDto,
  ) {
    return this.riskAssessmentsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'risk-assessments.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.riskAssessmentsService.remove(
      id,
    );
  }
}