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

import { ReferralStatusHistoryService } from './referral-status-history.service';

import { CreateReferralStatusHistoryDto } from './dto/create-referral-status-history.dto';
import { UpdateReferralStatusHistoryDto } from './dto/update-referral-status-history.dto';
import { QueryReferralStatusHistoryDto } from './dto/query-referral-status-history.dto';

@ApiTags('Referral Status History')
@ApiBearerAuth()
@Controller('referral-status-history')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralStatusHistoryController {
  constructor(
    private readonly referralStatusHistoryService: ReferralStatusHistoryService,
  ) {}

  @Permissions('referrals.create')
  @Post()
  create(
    @Body() dto: CreateReferralStatusHistoryDto,
  ) {
    return this.referralStatusHistoryService.create(dto);
  }

  @Permissions('referrals.read')
  @Get()
  findAll(
    @Query() query: QueryReferralStatusHistoryDto,
  ) {
    return this.referralStatusHistoryService.findAll(query);
  }

  @Permissions('referrals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.referralStatusHistoryService.findOne(id);
  }

  @Permissions('referrals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusHistoryDto,
  ) {
    return this.referralStatusHistoryService.update(id, dto);
  }

  @Permissions('referrals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.referralStatusHistoryService.remove(id);
  }
}