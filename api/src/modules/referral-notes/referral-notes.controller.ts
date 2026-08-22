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

import { ReferralNotesService } from './referral-notes.service';

import { CreateReferralNoteDto } from './dto/create-referral-note.dto';
import { UpdateReferralNoteDto } from './dto/update-referral-note.dto';
import { QueryReferralNoteDto } from './dto/query-referral-note.dto';

@ApiTags('Referral Notes')
@ApiBearerAuth()
@Controller('referral-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralNotesController {
  constructor(
    private readonly referralNotesService: ReferralNotesService,
  ) {}

  @Permissions('referrals.create')
  @Post()
  create(
    @Body() dto: CreateReferralNoteDto,
  ) {
    return this.referralNotesService.create(dto);
  }

  @Permissions('referrals.read')
  @Get()
  findAll(
    @Query() query: QueryReferralNoteDto,
  ) {
    return this.referralNotesService.findAll(query);
  }

  @Permissions('referrals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.referralNotesService.findOne(id);
  }

  @Permissions('referrals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralNoteDto,
  ) {
    return this.referralNotesService.update(id, dto);
  }

  @Permissions('referrals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.referralNotesService.remove(id);
  }
}