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

import { CountriesService } from './countries.service';

import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { QueryCountryDto } from './dto/query-country.dto';

@ApiTags('Countries')
@ApiBearerAuth()
@Controller('countries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
  ) {}

  @Permissions('country.create')
  @Post()
  create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @Permissions('country.read')
  @Get()
  findAll(@Query() query: QueryCountryDto) {
    return this.countriesService.findAll(query);
  }

  @Permissions('country.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countriesService.findOne(id);
  }

  @Permissions('country.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCountryDto,
  ) {
    return this.countriesService.update(id, dto);
  }

  @Permissions('country.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countriesService.remove(id);
  }
}