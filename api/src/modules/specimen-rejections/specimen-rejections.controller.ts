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

import { SpecimenRejectionsService } from './specimen-rejections.service';

import { CreateSpecimenRejectionDto } from './dto/create-specimen-rejection.dto';
import { UpdateSpecimenRejectionDto } from './dto/update-specimen-rejection.dto';
import { QuerySpecimenRejectionDto } from './dto/query-specimen-rejection.dto';

@ApiTags('Specimen Rejections')
@ApiBearerAuth()
@Controller('specimen-rejections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SpecimenRejectionsController {
  constructor(
    private readonly specimenRejectionsService: SpecimenRejectionsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateSpecimenRejectionDto,
  ) {
    return this.specimenRejectionsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QuerySpecimenRejectionDto,
  ) {
    return this.specimenRejectionsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.specimenRejectionsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecimenRejectionDto,
  ) {
    return this.specimenRejectionsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.specimenRejectionsService.remove(id);
  }
}