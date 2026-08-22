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

import { ClinicalEpisodeAttachmentsService } from './clinical-episode-attachments.service';

import { CreateClinicalEpisodeAttachmentDto } from './dto/create-clinical-episode-attachment.dto';
import { UpdateClinicalEpisodeAttachmentDto } from './dto/update-clinical-episode-attachment.dto';
import { QueryClinicalEpisodeAttachmentDto } from './dto/query-clinical-episode-attachment.dto';

@ApiTags('Clinical Episode Attachments')
@ApiBearerAuth()
@Controller(
  'clinical-episode-attachments',
)
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClinicalEpisodeAttachmentsController {
  constructor(
    private readonly clinicalEpisodeAttachmentsService: ClinicalEpisodeAttachmentsService,
  ) {}

  @Permissions(
    'clinical-episode-attachments.create',
  )
  @Post()
  create(
    @Body()
    dto: CreateClinicalEpisodeAttachmentDto,
  ) {
    return this.clinicalEpisodeAttachmentsService.create(
      dto,
    );
  }

  @Permissions(
    'clinical-episode-attachments.read',
  )
  @Get()
  findAll(
    @Query()
    query: QueryClinicalEpisodeAttachmentDto,
  ) {
    return this.clinicalEpisodeAttachmentsService.findAll(
      query,
    );
  }

  @Permissions(
    'clinical-episode-attachments.read',
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.clinicalEpisodeAttachmentsService.findOne(
      id,
    );
  }

  @Permissions(
    'clinical-episode-attachments.update',
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateClinicalEpisodeAttachmentDto,
  ) {
    return this.clinicalEpisodeAttachmentsService.update(
      id,
      dto,
    );
  }

  @Permissions(
    'clinical-episode-attachments.delete',
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.clinicalEpisodeAttachmentsService.remove(
      id,
    );
  }
}