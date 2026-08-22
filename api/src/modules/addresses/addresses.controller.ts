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

import { AddressesService } from './addresses.service';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@Controller('addresses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}

  @Permissions('address.create')
  @Post()
  create(@Body() dto: CreateAddressDto) {
    return this.addressesService.create(dto);
  }

  @Permissions('address.read')
  @Get()
  findAll(@Query() query: QueryAddressDto) {
    return this.addressesService.findAll(query);
  }

  @Permissions('address.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addressesService.findOne(id);
  }

  @Permissions('address.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, dto);
  }

  @Permissions('address.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.addressesService.remove(id);
  }
}