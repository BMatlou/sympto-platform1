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

import { ClaimPaymentsService } from './claim-payments.service';

import { CreateClaimPaymentDto } from './dto/create-claim-payment.dto';
import { QueryClaimPaymentDto } from './dto/query-claim-payment.dto';
import { UpdateClaimPaymentDto } from './dto/update-claim-payment.dto';

@ApiTags('Claim Payments')
@ApiBearerAuth()
@Controller('claim-payments')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClaimPaymentsController {
  constructor(
    private readonly claimPaymentsService: ClaimPaymentsService,
  ) {}

  @Permissions('claim-payments.create')
  @Post()
  create(
    @Body() dto: CreateClaimPaymentDto,
  ) {
    return this.claimPaymentsService.create(dto);
  }

  @Permissions('claim-payments.read')
  @Get()
  findAll(
    @Query() query: QueryClaimPaymentDto,
  ) {
    return this.claimPaymentsService.findAll(query);
  }

  @Permissions('claim-payments.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.claimPaymentsService.findOne(id);
  }

  @Permissions('claim-payments.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClaimPaymentDto,
  ) {
    return this.claimPaymentsService.update(
      id,
      dto,
    );
  }

  @Permissions('claim-payments.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.claimPaymentsService.remove(id);
  }
}