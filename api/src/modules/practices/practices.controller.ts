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

import { PracticesService } from './practices.service';

import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdatePracticeDto } from './dto/update-practice.dto';
import { QueryPracticeDto } from './dto/query-practice.dto';

@ApiTags('Practices')
@ApiBearerAuth()
@Controller('practices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PracticesController {
  constructor(
    private readonly practicesService: PracticesService,
  ) {}

  @Permissions('practice.create')
  @Post()
  create(@Body() dto: CreatePracticeDto) {
    return this.practicesService.create(dto);
  }

  @Permissions('practice.read')
  @Get()
  findAll(@Query() query: QueryPracticeDto) {
    return this.practicesService.findAll(query);
  }

  @Permissions('practice.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practicesService.findOne(id);
  }

  @Permissions('practice.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePracticeDto,
  ) {
    return this.practicesService.update(id, dto);
  }

  @Permissions('practice.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practicesService.remove(id);
  }
}