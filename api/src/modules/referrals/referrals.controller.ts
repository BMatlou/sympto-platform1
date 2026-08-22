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

import { ReferralsService } from './referrals.service';

import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { QueryReferralDto } from './dto/query-referral.dto';

@ApiTags('Referrals')
@ApiBearerAuth()
@Controller('referrals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
  ) {}

  @Permissions('referrals.create')
  @Post()
  create(
    @Body() dto: CreateReferralDto,
  ) {
    return this.referralsService.create(dto);
  }

  @Permissions('referrals.read')
  @Get()
  findAll(
    @Query() query: QueryReferralDto,
  ) {
    return this.referralsService.findAll(query);
  }

  @Permissions('referrals.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.referralsService.findOne(id);
  }

  @Permissions('referrals.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
  ) {
    return this.referralsService.update(id, dto);
  }

  @Permissions('referrals.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.referralsService.remove(id);
  }
}