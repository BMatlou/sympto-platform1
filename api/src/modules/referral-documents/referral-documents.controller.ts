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

import { ReferralDocumentsService } from './referral-documents.service';

import { CreateReferralDocumentDto } from './dto/create-referral-document.dto';
import { UpdateReferralDocumentDto } from './dto/update-referral-document.dto';
import { QueryReferralDocumentDto } from './dto/query-referral-document.dto';

@ApiTags('Referral Documents')
@ApiBearerAuth()
@Controller('referral-documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralDocumentsController {
  constructor(
    private readonly referralDocumentsService: ReferralDocumentsService,
  ) {}

  @Permissions('referrals.create')
  @Post()
  create(
    @Body() dto: CreateReferralDocumentDto,
  ) {
    return this.referralDocumentsService.create(dto);
  }

  @Permissions('referrals.read')
  @Get()
  findAll(
    @Query() query: QueryReferralDocumentDto,
  ) {
    return this.referralDocumentsService.findAll(query);
  }

  @Permissions('referrals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.referralDocumentsService.findOne(id);
  }

  @Permissions('referrals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralDocumentDto,
  ) {
    return this.referralDocumentsService.update(id, dto);
  }

  @Permissions('referrals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.referralDocumentsService.remove(id);
  }
}