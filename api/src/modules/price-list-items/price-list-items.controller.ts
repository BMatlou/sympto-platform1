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

import { PriceListItemsService } from './price-list-items.service';

import { CreatePriceListItemDto } from './dto/create-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { QueryPriceListItemDto } from './dto/query-price-list-item.dto';

@ApiTags('Price List Items')
@ApiBearerAuth()
@Controller('price-list-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PriceListItemsController {
  constructor(
    private readonly priceListItemsService: PriceListItemsService,
  ) {}

  @Permissions('billing.create')
  @Post()
  create(
    @Body() dto: CreatePriceListItemDto,
  ) {
    return this.priceListItemsService.create(dto);
  }

  @Permissions('billing.read')
  @Get()
  findAll(
    @Query() query: QueryPriceListItemDto,
  ) {
    return this.priceListItemsService.findAll(query);
  }

  @Permissions('billing.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.priceListItemsService.findOne(id);
  }

  @Permissions('billing.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceListItemDto,
  ) {
    return this.priceListItemsService.update(id, dto);
  }

  @Permissions('billing.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.priceListItemsService.remove(id);
  }
}