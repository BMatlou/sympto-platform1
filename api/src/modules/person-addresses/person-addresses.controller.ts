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

import { PersonAddressesService } from './person-addresses.service';

import { CreatePersonAddressDto } from './dto/create-person-address.dto';
import { UpdatePersonAddressDto } from './dto/update-person-address.dto';
import { QueryPersonAddressDto } from './dto/query-person-address.dto';

@ApiTags('Person Addresses')
@ApiBearerAuth()
@Controller('person-addresses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonAddressesController {
  constructor(
    private readonly personAddressesService: PersonAddressesService,
  ) {}

  @Permissions('person-address.create')
  @Post()
  create(@Body() dto: CreatePersonAddressDto) {
    return this.personAddressesService.create(dto);
  }

  @Permissions('person-address.read')
  @Get()
  findAll(@Query() query: QueryPersonAddressDto) {
    return this.personAddressesService.findAll(query);
  }

  @Permissions('person-address.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personAddressesService.findOne(id);
  }

  @Permissions('person-address.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonAddressDto,
  ) {
    return this.personAddressesService.update(id, dto);
  }

  @Permissions('person-address.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.personAddressesService.remove(id);
  }
}