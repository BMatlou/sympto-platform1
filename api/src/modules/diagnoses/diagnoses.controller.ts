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

import { DiagnosesService } from './diagnoses.service';

import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';
import { QueryDiagnosisDto } from './dto/query-diagnosis.dto';

@ApiTags('Diagnoses')
@ApiBearerAuth()
@Controller('diagnoses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DiagnosesController {
  constructor(
    private readonly diagnosesService: DiagnosesService,
  ) {}

  @Permissions('diagnosis.create')
  @Post()
  create(@Body() dto: CreateDiagnosisDto) {
    return this.diagnosesService.create(dto);
  }

  @Permissions('diagnosis.read')
  @Get()
  findAll(@Query() query: QueryDiagnosisDto) {
    return this.diagnosesService.findAll(query);
  }

  @Permissions('diagnosis.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diagnosesService.findOne(id);
  }

  @Permissions('diagnosis.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.diagnosesService.update(id, dto);
  }

  @Permissions('diagnosis.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diagnosesService.remove(id);
  }
}