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

import { ResultVerificationsService } from './result-verifications.service';

import { CreateResultVerificationDto } from './dto/create-result-verification.dto';
import { UpdateResultVerificationDto } from './dto/update-result-verification.dto';
import { QueryResultVerificationDto } from './dto/query-result-verification.dto';

@ApiTags('Result Verifications')
@ApiBearerAuth()
@Controller('result-verifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResultVerificationsController {
  constructor(
    private readonly resultVerificationsService: ResultVerificationsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateResultVerificationDto,
  ) {
    return this.resultVerificationsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryResultVerificationDto,
  ) {
    return this.resultVerificationsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.resultVerificationsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResultVerificationDto,
  ) {
    return this.resultVerificationsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.resultVerificationsService.remove(id);
  }
}