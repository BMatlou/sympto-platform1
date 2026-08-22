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

import { ConditionsService } from './conditions.service';

import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { QueryConditionDto } from './dto/query-condition.dto';

@ApiTags('Conditions')
@ApiBearerAuth()
@Controller('conditions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConditionsController {
  constructor(
    private readonly conditionsService: ConditionsService,
  ) {}

  @Permissions('conditions.create')
  @Post()
  create(@Body() dto: CreateConditionDto) {
    return this.conditionsService.create(dto);
  }

  @Permissions('conditions.read')
  @Get()
  findAll(@Query() query: QueryConditionDto) {
    return this.conditionsService.findAll(query);
  }

  @Permissions('conditions.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conditionsService.findOne(id);
  }

  @Permissions('conditions.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConditionDto,
  ) {
    return this.conditionsService.update(id, dto);
  }

  @Permissions('conditions.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conditionsService.remove(id);
  }
}