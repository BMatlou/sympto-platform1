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

import { PublicHealthAttachmentsService } from './public-health-attachments.service';

import { CreatePublicHealthAttachmentDto } from './dto/create-public-health-attachment.dto';
import { UpdatePublicHealthAttachmentDto } from './dto/update-public-health-attachment.dto';
import { QueryPublicHealthAttachmentDto } from './dto/query-public-health-attachment.dto';

@ApiTags('Public Health Attachments')
@ApiBearerAuth()
@Controller('public-health-attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PublicHealthAttachmentsController {
  constructor(
    private readonly publicHealthAttachmentsService: PublicHealthAttachmentsService,
  ) {}

  @Permissions('public-health.create')
  @Post()
  create(
    @Body() dto: CreatePublicHealthAttachmentDto,
  ) {
    return this.publicHealthAttachmentsService.create(dto);
  }

  @Permissions('public-health.read')
  @Get()
  findAll(
    @Query() query: QueryPublicHealthAttachmentDto,
  ) {
    return this.publicHealthAttachmentsService.findAll(query);
  }

  @Permissions('public-health.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.publicHealthAttachmentsService.findOne(id);
  }

  @Permissions('public-health.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicHealthAttachmentDto,
  ) {
    return this.publicHealthAttachmentsService.update(id, dto);
  }

  @Permissions('public-health.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.publicHealthAttachmentsService.remove(id);
  }
}