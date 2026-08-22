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

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Permissions('payments.create')
  @Post()
  create(
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(
      dto,
    );
  }

  @Permissions('payments.read')
  @Get()
  findAll(
    @Query() query: QueryPaymentDto,
  ) {
    return this.paymentsService.findAll(
      query,
    );
  }

  @Permissions('payments.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(
      id,
    );
  }

  @Permissions('payments.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(
      id,
      dto,
    );
  }

  @Permissions('payments.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.paymentsService.remove(
      id,
    );
  }
}