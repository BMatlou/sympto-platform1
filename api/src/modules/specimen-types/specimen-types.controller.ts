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

import { SpecimenTypesService } from './specimen-types.service';

import { CreateSpecimenTypeDto } from './dto/create-specimen-type.dto';
import { UpdateSpecimenTypeDto } from './dto/update-specimen-type.dto';
import { QuerySpecimenTypeDto } from './dto/query-specimen-type.dto';

@ApiTags('Specimen Types')
@ApiBearerAuth()
@Controller('specimen-types')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class SpecimenTypesController {
  constructor(
    private readonly specimenTypesService: SpecimenTypesService,
  ) {}

  @Permissions('specimen-type.create')
  @Post()
  create(
    @Body()
    dto: CreateSpecimenTypeDto,
  ) {
    return this.specimenTypesService.create(dto);
  }

  @Permissions('specimen-type.read')
  @Get()
  findAll(
    @Query()
    query: QuerySpecimenTypeDto,
  ) {
    return this.specimenTypesService.findAll(query);
  }

  @Permissions('specimen-type.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.specimenTypesService.findOne(id);
  }

  @Permissions('specimen-type.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateSpecimenTypeDto,
  ) {
    return this.specimenTypesService.update(
      id,
      dto,
    );
  }

  @Permissions('specimen-type.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.specimenTypesService.remove(id);
  }
}