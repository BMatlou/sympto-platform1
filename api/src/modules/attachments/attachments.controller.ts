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

import { AttachmentsService } from './attachments.service';

import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { QueryAttachmentDto } from './dto/query-attachment.dto';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Permissions('attachments.create')
  @Post()
  create(
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.attachmentsService.create(dto);
  }

  @Permissions('attachments.read')
  @Get()
  findAll(
    @Query() query: QueryAttachmentDto,
  ) {
    return this.attachmentsService.findAll(query);
  }

  @Permissions('attachments.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.attachmentsService.findOne(id);
  }

  @Permissions('attachments.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttachmentDto,
  ) {
    return this.attachmentsService.update(id, dto);
  }

  @Permissions('attachments.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.attachmentsService.remove(id);
  }
}