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

import { QualificationsService } from './qualifications.service';

import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { QueryQualificationDto } from './dto/query-qualification.dto';

@ApiTags('Qualifications')
@ApiBearerAuth()
@Controller('qualifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QualificationsController {
  constructor(
    private readonly qualificationsService: QualificationsService,
  ) {}

  @Permissions('qualification.create')
  @Post()
  create(@Body() dto: CreateQualificationDto) {
    return this.qualificationsService.create(dto);
  }

  @Permissions('qualification.read')
  @Get()
  findAll(@Query() query: QueryQualificationDto) {
    return this.qualificationsService.findAll(query);
  }

  @Permissions('qualification.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.qualificationsService.findOne(id);
  }

  @Permissions('qualification.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQualificationDto,
  ) {
    return this.qualificationsService.update(id, dto);
  }

  @Permissions('qualification.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.qualificationsService.remove(id);
  }
}