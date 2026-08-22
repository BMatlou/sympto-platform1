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

import { SymptomLogsService } from './symptom-logs.service';

import { CreateSymptomLogDto } from './dto/create-symptom-log.dto';
import { UpdateSymptomLogDto } from './dto/update-symptom-log.dto';
import { QuerySymptomLogDto } from './dto/query-symptom-log.dto';

@ApiTags('Symptom Logs')
@ApiBearerAuth()
@Controller('symptom-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SymptomLogsController {
  constructor(
    private readonly symptomLogsService: SymptomLogsService,
  ) {}

  @Permissions('symptom-logs.create')
  @Post()
  create(
    @Body() dto: CreateSymptomLogDto,
  ) {
    return this.symptomLogsService.create(dto);
  }

  @Permissions('symptom-logs.read')
  @Get()
  findAll(
    @Query() query: QuerySymptomLogDto,
  ) {
    return this.symptomLogsService.findAll(query);
  }

  @Permissions('symptom-logs.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.symptomLogsService.findOne(id);
  }

  @Permissions('symptom-logs.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSymptomLogDto,
  ) {
    return this.symptomLogsService.update(
      id,
      dto,
    );
  }

  @Permissions('symptom-logs.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.symptomLogsService.remove(id);
  }
}