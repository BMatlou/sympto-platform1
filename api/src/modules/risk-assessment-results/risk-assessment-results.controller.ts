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

import { RiskAssessmentResultsService } from './risk-assessment-results.service';

import { CreateRiskAssessmentResultDto } from './dto/create-risk-assessment-result.dto';
import { UpdateRiskAssessmentResultDto } from './dto/update-risk-assessment-result.dto';
import { QueryRiskAssessmentResultDto } from './dto/query-risk-assessment-result.dto';

@ApiTags('Risk Assessment Results')
@ApiBearerAuth()
@Controller(
  'risk-assessment-results',
)
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class RiskAssessmentResultsController {
  constructor(
    private readonly riskAssessmentResultsService: RiskAssessmentResultsService,
  ) {}

  @Permissions(
    'risk-assessment-results.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateRiskAssessmentResultDto,
  ) {
    return this.riskAssessmentResultsService.create(
      dto,
    );
  }

  @Permissions(
    'risk-assessment-results.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryRiskAssessmentResultDto,
  ) {
    return this.riskAssessmentResultsService.findAll(
      query,
    );
  }

  @Permissions(
    'risk-assessment-results.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.riskAssessmentResultsService.findOne(
      id,
    );
  }

  @Permissions(
    'risk-assessment-results.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateRiskAssessmentResultDto,
  ) {
    return this.riskAssessmentResultsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'risk-assessment-results.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.riskAssessmentResultsService.remove(
      id,
    );
  }
}