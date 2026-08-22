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

import { LabResultsService } from './lab-results.service';

import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { UpdateLabResultDto } from './dto/update-lab-result.dto';
import { QueryLabResultDto } from './dto/query-lab-result.dto';

@ApiTags('Lab Results')
@ApiBearerAuth()
@Controller('lab-results')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabResultsController {
  constructor(
    private readonly labResultsService: LabResultsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(@Body() dto: CreateLabResultDto) {
    return this.labResultsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(@Query() query: QueryLabResultDto) {
    return this.labResultsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.labResultsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabResultDto,
  ) {
    return this.labResultsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.labResultsService.remove(id);
  }
}