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

import { ImagingProceduresService } from './imaging-procedures.service';

import { CreateImagingProcedureDto } from './dto/create-imaging-procedure.dto';
import { UpdateImagingProcedureDto } from './dto/update-imaging-procedure.dto';
import { QueryImagingProcedureDto } from './dto/query-imaging-procedure.dto';

@ApiTags('Imaging Procedures')
@ApiBearerAuth()
@Controller('imaging-procedures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingProceduresController {
  constructor(
    private readonly imagingProceduresService: ImagingProceduresService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingProcedureDto,
  ) {
    return this.imagingProceduresService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingProcedureDto,
  ) {
    return this.imagingProceduresService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingProceduresService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingProcedureDto,
  ) {
    return this.imagingProceduresService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingProceduresService.remove(id);
  }
}