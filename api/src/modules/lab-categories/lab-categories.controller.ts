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

import { LabCategoriesService } from './lab-categories.service';

import { CreateLabCategoryDto } from './dto/create-lab-category.dto';
import { UpdateLabCategoryDto } from './dto/update-lab-category.dto';
import { QueryLabCategoryDto } from './dto/query-lab-category.dto';

@ApiTags('Lab Categories')
@ApiBearerAuth()
@Controller('lab-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabCategoriesController {
  constructor(
    private readonly labCategoriesService: LabCategoriesService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabCategoryDto,
  ) {
    return this.labCategoriesService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabCategoryDto,
  ) {
    return this.labCategoriesService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labCategoriesService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabCategoryDto,
  ) {
    return this.labCategoriesService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labCategoriesService.remove(id);
  }
}