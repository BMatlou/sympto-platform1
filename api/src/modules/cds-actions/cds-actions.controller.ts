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

import { CdsActionsService } from './cds-actions.service';

import { CreateCdsActionDto } from './dto/create-cds-action.dto';
import { UpdateCdsActionDto } from './dto/update-cds-action.dto';
import { QueryCdsActionDto } from './dto/query-cds-action.dto';

@ApiTags('Cds Actions')
@ApiBearerAuth()
@Controller('cds-actions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CdsActionsController {
  constructor(
    private readonly cdsActionsService: CdsActionsService,
  ) {}

  @Permissions('cds.create')
  @Post()
  create(
    @Body() dto: CreateCdsActionDto,
  ) {
    return this.cdsActionsService.create(dto);
  }

  @Permissions('cds.read')
  @Get()
  findAll(
    @Query() query: QueryCdsActionDto,
  ) {
    return this.cdsActionsService.findAll(query);
  }

  @Permissions('cds.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.cdsActionsService.findOne(id);
  }

  @Permissions('cds.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCdsActionDto,
  ) {
    return this.cdsActionsService.update(id, dto);
  }

  @Permissions('cds.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.cdsActionsService.remove(id);
  }
}