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

import { ClinicalDecisionSupportService } from './clinical-decision-support.service';

import { CreateClinicalDecisionSupportDto } from './dto/create-clinical-decision-support.dto';
import { UpdateClinicalDecisionSupportDto } from './dto/update-clinical-decision-support.dto';
import { QueryClinicalDecisionSupportDto } from './dto/query-clinical-decision-support.dto';

@ApiTags('Clinical Decision Support')
@ApiBearerAuth()
@Controller('clinical-decision-support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClinicalDecisionSupportController {
  constructor(
    private readonly clinicalDecisionSupportService: ClinicalDecisionSupportService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(
    @Body() dto: CreateClinicalDecisionSupportDto,
  ) {
    return this.clinicalDecisionSupportService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(
    @Query() query: QueryClinicalDecisionSupportDto,
  ) {
    return this.clinicalDecisionSupportService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.clinicalDecisionSupportService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalDecisionSupportDto,
  ) {
    return this.clinicalDecisionSupportService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.clinicalDecisionSupportService.remove(id);
  }
}