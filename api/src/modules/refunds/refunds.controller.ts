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

import { RefundsService } from './refunds.service';

import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { QueryRefundDto } from './dto/query-refund.dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('refunds')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class RefundsController {
  constructor(
    private readonly refundsService: RefundsService,
  ) {}

  @Permissions('refunds.create')
  @Post()
  create(
    @Body() dto: CreateRefundDto,
  ) {
    return this.refundsService.create(dto);
  }

  @Permissions('refunds.read')
  @Get()
  findAll(
    @Query() query: QueryRefundDto,
  ) {
    return this.refundsService.findAll(query);
  }

  @Permissions('refunds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.refundsService.findOne(id);
  }

  @Permissions('refunds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRefundDto,
  ) {
    return this.refundsService.update(
      id,
      dto,
    );
  }

  @Permissions('refunds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.refundsService.remove(id);
  }
}