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

import { SymptomLogAttachmentsService } from './symptom-log-attachments.service';

import { CreateSymptomLogAttachmentDto } from './dto/create-symptom-log-attachment.dto';
import { UpdateSymptomLogAttachmentDto } from './dto/update-symptom-log-attachment.dto';
import { QuerySymptomLogAttachmentDto } from './dto/query-symptom-log-attachment.dto';

@ApiTags('Symptom Log Attachments')
@ApiBearerAuth()
@Controller(
  'symptom-log-attachments',
)
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class SymptomLogAttachmentsController {
  constructor(
    private readonly symptomLogAttachmentsService: SymptomLogAttachmentsService,
  ) {}

  @Permissions(
    'symptom-log-attachments.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateSymptomLogAttachmentDto,
  ) {
    return this.symptomLogAttachmentsService.create(
      dto,
    );
  }

  @Permissions(
    'symptom-log-attachments.read',
  )
  @Get()
  findAll(
    @Query()
    query: QuerySymptomLogAttachmentDto,
  ) {
    return this.symptomLogAttachmentsService.findAll(
      query,
    );
  }

  @Permissions(
    'symptom-log-attachments.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.symptomLogAttachmentsService.findOne(
      id,
    );
  }

  @Permissions(
    'symptom-log-attachments.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateSymptomLogAttachmentDto,
  ) {
    return this.symptomLogAttachmentsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'symptom-log-attachments.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.symptomLogAttachmentsService.remove(
      id,
    );
  }
}