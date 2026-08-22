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

import { SpecimensService } from './specimens.service';

import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { UpdateSpecimenDto } from './dto/update-specimen.dto';
import { QuerySpecimenDto } from './dto/query-specimen.dto';

@ApiTags('Specimens')
@ApiBearerAuth()
@Controller('specimens')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpecimensController {
  constructor(
    private readonly specimensService: SpecimensService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateSpecimenDto,
  ) {
    return this.specimensService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QuerySpecimenDto,
  ) {
    return this.specimensService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.specimensService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecimenDto,
  ) {
    return this.specimensService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.specimensService.remove(id);
  }
}