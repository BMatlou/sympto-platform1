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

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { AllergiesService } from './allergies.service';

import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { QueryAllergyDto } from './dto/query-allergy.dto';

@ApiTags('Allergies')
@ApiBearerAuth()
@Controller('allergies')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AllergiesController {
  constructor(
    private readonly allergiesService: AllergiesService,
  ) {}

  @Permissions('allergy.create')
  @Post()
  create(
    @Body()
    dto: CreateAllergyDto,
  ) {
    return this.allergiesService.create(dto);
  }

  @Permissions('allergies.read')
  @Get()
  findAll(
    @Query()
    query: QueryAllergyDto,
  ) {
    return this.allergiesService.findAll(
      query,
    );
  }

  @Permissions('allergies.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.allergiesService.findOne(id);
  }

  @Permissions('allergy.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateAllergyDto,
  ) {
    return this.allergiesService.update(
      id,
      dto,
    );
  }

  @Permissions('allergy.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.allergiesService.remove(id);
  }
}