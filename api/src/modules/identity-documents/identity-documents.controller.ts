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

import { IdentityDocumentsService } from './identity-documents.service';

import { CreateIdentityDocumentDto } from './dto/create-identity-document.dto';
import { UpdateIdentityDocumentDto } from './dto/update-identity-document.dto';
import { QueryIdentityDocumentDto } from './dto/query-identity-document.dto';

@ApiTags('Identity Documents')
@ApiBearerAuth()
@Controller('identity-documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IdentityDocumentsController {
  constructor(
    private readonly identityDocumentsService: IdentityDocumentsService,
  ) {}

  @Permissions('identity-document.create')
  @Post()
  create(@Body() dto: CreateIdentityDocumentDto) {
    return this.identityDocumentsService.create(dto);
  }

  @Permissions('identity-document.read')
  @Get()
  findAll(@Query() query: QueryIdentityDocumentDto) {
    return this.identityDocumentsService.findAll(query);
  }

  @Permissions('identity-document.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.identityDocumentsService.findOne(id);
  }

  @Permissions('identity-document.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIdentityDocumentDto,
  ) {
    return this.identityDocumentsService.update(id, dto);
  }

  @Permissions('identity-document.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.identityDocumentsService.remove(id);
  }
}