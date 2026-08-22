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

import { PublicHealthSubmissionsService } from './public-health-submissions.service';

import { CreatePublicHealthSubmissionDto } from './dto/create-public-health-submission.dto';
import { UpdatePublicHealthSubmissionDto } from './dto/update-public-health-submission.dto';
import { QueryPublicHealthSubmissionDto } from './dto/query-public-health-submission.dto';

@ApiTags('Public Health Submissions')
@ApiBearerAuth()
@Controller('public-health-submissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PublicHealthSubmissionsController {
  constructor(
    private readonly publicHealthSubmissionsService: PublicHealthSubmissionsService,
  ) {}

  @Permissions('public-health.create')
  @Post()
  create(
    @Body() dto: CreatePublicHealthSubmissionDto,
  ) {
    return this.publicHealthSubmissionsService.create(dto);
  }

  @Permissions('public-health.read')
  @Get()
  findAll(
    @Query() query: QueryPublicHealthSubmissionDto,
  ) {
    return this.publicHealthSubmissionsService.findAll(query);
  }

  @Permissions('public-health.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.publicHealthSubmissionsService.findOne(id);
  }

  @Permissions('public-health.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicHealthSubmissionDto,
  ) {
    return this.publicHealthSubmissionsService.update(id, dto);
  }

  @Permissions('public-health.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.publicHealthSubmissionsService.remove(id);
  }
}