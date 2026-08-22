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

import { InvoiceHistoryService } from './invoice-history.service';

import { CreateInvoiceHistoryDto } from './dto/create-invoice-history.dto';
import { UpdateInvoiceHistoryDto } from './dto/update-invoice-history.dto';
import { QueryInvoiceHistoryDto } from './dto/query-invoice-history.dto';

@ApiTags('Invoice History')
@ApiBearerAuth()
@Controller('invoice-history')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoiceHistoryController {
  constructor(
    private readonly invoiceHistoryService: InvoiceHistoryService,
  ) {}

  @Permissions('invoice-history.create')
  @Post()
  create(@Body() dto: CreateInvoiceHistoryDto) {
    return this.invoiceHistoryService.create(dto);
  }

  @Permissions('invoice-history.read')
  @Get()
  findAll(@Query() query: QueryInvoiceHistoryDto) {
    return this.invoiceHistoryService.findAll(query);
  }

  @Permissions('invoice-history.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceHistoryService.findOne(id);
  }

  @Permissions('invoice-history.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceHistoryDto,
  ) {
    return this.invoiceHistoryService.update(id, dto);
  }

  @Permissions('invoice-history.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceHistoryService.remove(id);
  }
}