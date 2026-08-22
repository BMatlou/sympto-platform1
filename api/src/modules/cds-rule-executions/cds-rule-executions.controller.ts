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

import { CdsRuleExecutionsService } from './cds-rule-executions.service';

import { CreateCdsRuleExecutionDto } from './dto/create-cds-rule-execution.dto';
import { UpdateCdsRuleExecutionDto } from './dto/update-cds-rule-execution.dto';
import { QueryCdsRuleExecutionDto } from './dto/query-cds-rule-execution.dto';

@ApiTags('Cds Rule Executions')
@ApiBearerAuth()
@Controller('cds-rule-executions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CdsRuleExecutionsController {
  constructor(
    private readonly cdsRuleExecutionsService: CdsRuleExecutionsService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(
    @Body() dto: CreateCdsRuleExecutionDto,
  ) {
    return this.cdsRuleExecutionsService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(
    @Query() query: QueryCdsRuleExecutionDto,
  ) {
    return this.cdsRuleExecutionsService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.cdsRuleExecutionsService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCdsRuleExecutionDto,
  ) {
    return this.cdsRuleExecutionsService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.cdsRuleExecutionsService.remove(id);
  }
}