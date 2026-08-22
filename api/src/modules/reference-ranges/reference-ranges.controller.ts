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

import { ReferenceRangesService } from './reference-ranges.service';

import { CreateReferenceRangeDto } from './dto/create-reference-range.dto';
import { UpdateReferenceRangeDto } from './dto/update-reference-range.dto';
import { QueryReferenceRangeDto } from './dto/query-reference-range.dto';

@ApiTags('Reference Ranges')
@ApiBearerAuth()
@Controller('reference-ranges')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ReferenceRangesController {
  constructor(
    private readonly referenceRangesService: ReferenceRangesService,
  ) {}

  @Permissions('reference-range.create')
  @Post()
  create(
    @Body()
    dto: CreateReferenceRangeDto,
  ) {
    return this.referenceRangesService.create(dto);
  }

  @Permissions('reference-range.read')
  @Get()
  findAll(
    @Query()
    query: QueryReferenceRangeDto,
  ) {
    return this.referenceRangesService.findAll(query);
  }

  @Permissions('reference-range.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.referenceRangesService.findOne(id);
  }

  @Permissions('reference-range.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateReferenceRangeDto,
  ) {
    return this.referenceRangesService.update(
      id,
      dto,
    );
  }

  @Permissions('reference-range.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.referenceRangesService.remove(id);
  }
}