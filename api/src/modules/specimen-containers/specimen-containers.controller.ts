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

import { SpecimenContainersService } from './specimen-containers.service';

import { CreateSpecimenContainerDto } from './dto/create-specimen-container.dto';
import { UpdateSpecimenContainerDto } from './dto/update-specimen-container.dto';
import { QuerySpecimenContainerDto } from './dto/query-specimen-container.dto';

@ApiTags('Specimen Containers')
@ApiBearerAuth()
@Controller('specimen-containers')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class SpecimenContainersController {
  constructor(
    private readonly specimenContainersService: SpecimenContainersService,
  ) {}

  @Permissions('specimen-container.create')
  @Post()
  create(
    @Body()
    dto: CreateSpecimenContainerDto,
  ) {
    return this.specimenContainersService.create(dto);
  }

  @Permissions('specimen-container.read')
  @Get()
  findAll(
    @Query()
    query: QuerySpecimenContainerDto,
  ) {
    return this.specimenContainersService.findAll(query);
  }

  @Permissions('specimen-container.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.specimenContainersService.findOne(id);
  }

  @Permissions('specimen-container.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateSpecimenContainerDto,
  ) {
    return this.specimenContainersService.update(
      id,
      dto,
    );
  }

  @Permissions('specimen-container.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.specimenContainersService.remove(id);
  }
}