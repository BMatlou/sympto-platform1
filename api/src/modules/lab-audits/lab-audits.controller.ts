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

import { LabAuditsService } from './lab-audits.service';

import { CreateLabAuditDto } from './dto/create-lab-audit.dto';
import { UpdateLabAuditDto } from './dto/update-lab-audit.dto';
import { QueryLabAuditDto } from './dto/query-lab-audit.dto';

@ApiTags('Lab Audits')
@ApiBearerAuth()
@Controller('lab-audits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabAuditsController {
  constructor(
    private readonly labAuditsService: LabAuditsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabAuditDto,
  ) {
    return this.labAuditsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabAuditDto,
  ) {
    return this.labAuditsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labAuditsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabAuditDto,
  ) {
    return this.labAuditsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labAuditsService.remove(id);
  }
}