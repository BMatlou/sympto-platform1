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

import { PaymentAllocationsService } from './payment-allocations.service';

import { CreatePaymentAllocationDto } from './dto/create-payment-allocation.dto';
import { UpdatePaymentAllocationDto } from './dto/update-payment-allocation.dto';
import { QueryPaymentAllocationDto } from './dto/query-payment-allocation.dto';

@ApiTags('Payment Allocations')
@ApiBearerAuth()
@Controller('payment-allocations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentAllocationsController {
  constructor(
    private readonly paymentAllocationsService: PaymentAllocationsService,
  ) {}

  @Permissions('billing.create')
  @Post()
  create(
    @Body() dto: CreatePaymentAllocationDto,
  ) {
    return this.paymentAllocationsService.create(dto);
  }

  @Permissions('billing.read')
  @Get()
  findAll(
    @Query() query: QueryPaymentAllocationDto,
  ) {
    return this.paymentAllocationsService.findAll(query);
  }

  @Permissions('billing.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.paymentAllocationsService.findOne(id);
  }

  @Permissions('billing.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentAllocationDto,
  ) {
    return this.paymentAllocationsService.update(id, dto);
  }

  @Permissions('billing.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.paymentAllocationsService.remove(id);
  }
}