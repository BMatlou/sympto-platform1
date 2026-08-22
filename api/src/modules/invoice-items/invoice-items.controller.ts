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

import { InvoiceItemsService } from './invoice-items.service';

import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { QueryInvoiceItemDto } from './dto/query-invoice-item.dto';

@ApiTags('Invoice Items')
@ApiBearerAuth()
@Controller('invoice-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoiceItemsController {
  constructor(
    private readonly invoiceItemsService: InvoiceItemsService,
  ) {}

  @Permissions('billing.create')
  @Post()
  create(
    @Body() dto: CreateInvoiceItemDto,
  ) {
    return this.invoiceItemsService.create(dto);
  }

  @Permissions('billing.read')
  @Get()
  findAll(
    @Query() query: QueryInvoiceItemDto,
  ) {
    return this.invoiceItemsService.findAll(query);
  }

  @Permissions('billing.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.invoiceItemsService.findOne(id);
  }

  @Permissions('billing.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    return this.invoiceItemsService.update(id, dto);
  }

  @Permissions('billing.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.invoiceItemsService.remove(id);
  }
}