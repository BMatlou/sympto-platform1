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

import { PriceListsService } from './price-lists.service';

import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { QueryPriceListDto } from './dto/query-price-list.dto';

@ApiTags('Price Lists')
@ApiBearerAuth()
@Controller('price-lists')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PriceListsController {
  constructor(
    private readonly priceListsService: PriceListsService,
  ) {}

  @Permissions('billing.create')
  @Post()
  create(
    @Body() dto: CreatePriceListDto,
  ) {
    return this.priceListsService.create(dto);
  }

  @Permissions('billing.read')
  @Get()
  findAll(
    @Query() query: QueryPriceListDto,
  ) {
    return this.priceListsService.findAll(query);
  }

  @Permissions('billing.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.priceListsService.findOne(id);
  }

  @Permissions('billing.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.priceListsService.update(id, dto);
  }

  @Permissions('billing.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.priceListsService.remove(id);
  }
}