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

import { SymptomLogItemsService } from './symptom-log-items.service';

import { CreateSymptomLogItemDto } from './dto/create-symptom-log-item.dto';
import { UpdateSymptomLogItemDto } from './dto/update-symptom-log-item.dto';
import { QuerySymptomLogItemDto } from './dto/query-symptom-log-item.dto';

@ApiTags('Symptom Log Items')
@ApiBearerAuth()
@Controller('symptom-log-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SymptomLogItemsController {
  constructor(
    private readonly symptomLogItemsService: SymptomLogItemsService,
  ) {}

  @Permissions('symptom-log-items.create')
  @Post()
  create(
    @Body() dto: CreateSymptomLogItemDto,
  ) {
    return this.symptomLogItemsService.create(
      dto,
    );
  }

  @Permissions('symptom-log-items.read')
  @Get()
  findAll(
    @Query() query: QuerySymptomLogItemDto,
  ) {
    return this.symptomLogItemsService.findAll(
      query,
    );
  }

  @Permissions('symptom-log-items.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.symptomLogItemsService.findOne(
      id,
    );
  }

  @Permissions('symptom-log-items.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSymptomLogItemDto,
  ) {
    return this.symptomLogItemsService.update(
      id,
      dto,
    );
  }

  @Permissions('symptom-log-items.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.symptomLogItemsService.remove(
      id,
    );
  }
}