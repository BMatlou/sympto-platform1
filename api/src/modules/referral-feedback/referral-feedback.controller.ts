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

import { ReferralFeedbackService } from './referral-feedback.service';

import { CreateReferralFeedbackDto } from './dto/create-referral-feedback.dto';
import { UpdateReferralFeedbackDto } from './dto/update-referral-feedback.dto';
import { QueryReferralFeedbackDto } from './dto/query-referral-feedback.dto';

@ApiTags('Referral Feedback')
@ApiBearerAuth()
@Controller('referral-feedback')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralFeedbackController {
  constructor(
    private readonly referralFeedbackService: ReferralFeedbackService,
  ) {}

  @Permissions('referrals.create')
  @Post()
  create(
    @Body() dto: CreateReferralFeedbackDto,
  ) {
    return this.referralFeedbackService.create(dto);
  }

  @Permissions('referrals.read')
  @Get()
  findAll(
    @Query() query: QueryReferralFeedbackDto,
  ) {
    return this.referralFeedbackService.findAll(query);
  }

  @Permissions('referrals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.referralFeedbackService.findOne(id);
  }

  @Permissions('referrals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralFeedbackDto,
  ) {
    return this.referralFeedbackService.update(id, dto);
  }

  @Permissions('referrals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.referralFeedbackService.remove(id);
  }
}