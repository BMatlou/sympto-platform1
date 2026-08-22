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

import { SymptomTriggersService } from './symptom-triggers.service';

import { CreateSymptomTriggerDto } from './dto/create-symptom-trigger.dto';
import { UpdateSymptomTriggerDto } from './dto/update-symptom-trigger.dto';
import { QuerySymptomTriggerDto } from './dto/query-symptom-trigger.dto';

@ApiTags('Symptom Triggers')
@ApiBearerAuth()
@Controller('symptom-triggers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SymptomTriggersController {
  constructor(
    private readonly symptomTriggersService: SymptomTriggersService,
  ) {}

  @Permissions('symptom-triggers.create')
  @Post()
  create(
    @Body() dto: CreateSymptomTriggerDto,
  ) {
    return this.symptomTriggersService.create(
      dto,
    );
  }

  @Permissions('symptom-triggers.read')
  @Get()
  findAll(
    @Query() query: QuerySymptomTriggerDto,
  ) {
    return this.symptomTriggersService.findAll(
      query,
    );
  }

  @Permissions('symptom-triggers.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.symptomTriggersService.findOne(
      id,
    );
  }

  @Permissions('symptom-triggers.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSymptomTriggerDto,
  ) {
    return this.symptomTriggersService.update(
      id,
      dto,
    );
  }

  @Permissions('symptom-triggers.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.symptomTriggersService.remove(
      id,
    );
  }
}