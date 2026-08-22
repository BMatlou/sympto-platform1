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

import { SpecimenCollectionsService } from './specimen-collections.service';

import { CreateSpecimenCollectionDto } from './dto/create-specimen-collection.dto';
import { UpdateSpecimenCollectionDto } from './dto/update-specimen-collection.dto';
import { QuerySpecimenCollectionDto } from './dto/query-specimen-collection.dto';

@ApiTags('Specimen Collections')
@ApiBearerAuth()
@Controller('specimen-collections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpecimenCollectionsController {
  constructor(
    private readonly specimenCollectionsService: SpecimenCollectionsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateSpecimenCollectionDto,
  ) {
    return this.specimenCollectionsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QuerySpecimenCollectionDto,
  ) {
    return this.specimenCollectionsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.specimenCollectionsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecimenCollectionDto,
  ) {
    return this.specimenCollectionsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.specimenCollectionsService.remove(id);
  }
}