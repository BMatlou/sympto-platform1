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

import { ClaimDocumentsService } from './claim-documents.service';

import { CreateClaimDocumentDto } from './dto/create-claim-document.dto';
import { QueryClaimDocumentDto } from './dto/query-claim-document.dto';
import { UpdateClaimDocumentDto } from './dto/update-claim-document.dto';

@ApiTags('Claim Documents')
@ApiBearerAuth()
@Controller('claim-documents')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClaimDocumentsController {
  constructor(
    private readonly claimDocumentsService: ClaimDocumentsService,
  ) {}

  @Permissions('claim-documents.create')
  @Post()
  create(
    @Body() dto: CreateClaimDocumentDto,
  ) {
    return this.claimDocumentsService.create(dto);
  }

  @Permissions('claim-documents.read')
  @Get()
  findAll(
    @Query() query: QueryClaimDocumentDto,
  ) {
    return this.claimDocumentsService.findAll(query);
  }

  @Permissions('claim-documents.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.claimDocumentsService.findOne(id);
  }

  @Permissions('claim-documents.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClaimDocumentDto,
  ) {
    return this.claimDocumentsService.update(
      id,
      dto,
    );
  }

  @Permissions('claim-documents.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.claimDocumentsService.remove(id);
  }
}