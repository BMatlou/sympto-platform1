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

import { ClaimStatusHistoryService } from './claim-status-history.service';

import { CreateClaimStatusHistoryDto } from './dto/create-claim-status-history.dto';
import { QueryClaimStatusHistoryDto } from './dto/query-claim-status-history.dto';
import { UpdateClaimStatusHistoryDto } from './dto/update-claim-status-history.dto';

@ApiTags('Claim Status History')
@ApiBearerAuth()
@Controller('claim-status-history')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClaimStatusHistoryController {
  constructor(
    private readonly claimStatusHistoryService: ClaimStatusHistoryService,
  ) {}

  @Permissions('claim-status-history.create')
  @Post()
  create(
    @Body() dto: CreateClaimStatusHistoryDto,
  ) {
    return this.claimStatusHistoryService.create(dto);
  }

  @Permissions('claim-status-history.read')
  @Get()
  findAll(
    @Query() query: QueryClaimStatusHistoryDto,
  ) {
    return this.claimStatusHistoryService.findAll(query);
  }

  @Permissions('claim-status-history.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.claimStatusHistoryService.findOne(id);
  }

  @Permissions('claim-status-history.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusHistoryDto,
  ) {
    return this.claimStatusHistoryService.update(
      id,
      dto,
    );
  }

  @Permissions('claim-status-history.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.claimStatusHistoryService.remove(id);
  }
}