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

import { LabMethodsService } from './lab-methods.service';

import { CreateLabMethodDto } from './dto/create-lab-method.dto';
import { UpdateLabMethodDto } from './dto/update-lab-method.dto';
import { QueryLabMethodDto } from './dto/query-lab-method.dto';

@ApiTags('Lab Methods')
@ApiBearerAuth()
@Controller('lab-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabMethodsController {
  constructor(
    private readonly labMethodsService: LabMethodsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabMethodDto,
  ) {
    return this.labMethodsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabMethodDto,
  ) {
    return this.labMethodsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labMethodsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabMethodDto,
  ) {
    return this.labMethodsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labMethodsService.remove(id);
  }
}