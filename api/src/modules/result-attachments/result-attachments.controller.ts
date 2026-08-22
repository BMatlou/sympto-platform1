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

import { ResultAttachmentsService } from './result-attachments.service';

import { CreateResultAttachmentDto } from './dto/create-result-attachment.dto';
import { UpdateResultAttachmentDto } from './dto/update-result-attachment.dto';
import { QueryResultAttachmentDto } from './dto/query-result-attachment.dto';

@ApiTags('Result Attachments')
@ApiBearerAuth()
@Controller('result-attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResultAttachmentsController {
  constructor(
    private readonly resultAttachmentsService: ResultAttachmentsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateResultAttachmentDto,
  ) {
    return this.resultAttachmentsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryResultAttachmentDto,
  ) {
    return this.resultAttachmentsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.resultAttachmentsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResultAttachmentDto,
  ) {
    return this.resultAttachmentsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.resultAttachmentsService.remove(id);
  }
}