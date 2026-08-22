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

import { ResultAmendmentsService } from './result-amendments.service';

import { CreateResultAmendmentDto } from './dto/create-result-amendment.dto';
import { UpdateResultAmendmentDto } from './dto/update-result-amendment.dto';
import { QueryResultAmendmentDto } from './dto/query-result-amendment.dto';

@ApiTags('Result Amendments')
@ApiBearerAuth()
@Controller('result-amendments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResultAmendmentsController {
  constructor(
    private readonly resultAmendmentsService: ResultAmendmentsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateResultAmendmentDto,
  ) {
    return this.resultAmendmentsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryResultAmendmentDto,
  ) {
    return this.resultAmendmentsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.resultAmendmentsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResultAmendmentDto,
  ) {
    return this.resultAmendmentsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.resultAmendmentsService.remove(id);
  }
}