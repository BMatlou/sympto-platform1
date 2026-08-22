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

import { LabResultItemsService } from './lab-result-items.service';

import { CreateLabResultItemDto } from './dto/create-lab-result-item.dto';
import { UpdateLabResultItemDto } from './dto/update-lab-result-item.dto';
import { QueryLabResultItemDto } from './dto/query-lab-result-item.dto';

@ApiTags('Lab Result Items')
@ApiBearerAuth()
@Controller('lab-result-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabResultItemsController {
  constructor(
    private readonly labResultItemsService: LabResultItemsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabResultItemDto,
  ) {
    return this.labResultItemsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabResultItemDto,
  ) {
    return this.labResultItemsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labResultItemsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabResultItemDto,
  ) {
    return this.labResultItemsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labResultItemsService.remove(id);
  }
}