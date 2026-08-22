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

import { ConsentsService } from './consents.service';

import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { QueryConsentDto } from './dto/query-consent.dto';

@ApiTags('Consents')
@ApiBearerAuth()
@Controller('consents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConsentsController {
  constructor(
    private readonly consentsService: ConsentsService,
  ) {}

  @Permissions('consent.create')
  @Post()
  create(
    @Body() dto: CreateConsentDto,
  ) {
    return this.consentsService.create(dto);
  }

  @Permissions('consent.read')
  @Get()
  findAll(
    @Query() query: QueryConsentDto,
  ) {
    return this.consentsService.findAll(query);
  }

  @Permissions('consent.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.consentsService.findOne(id);
  }

  @Permissions('consent.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConsentDto,
  ) {
    return this.consentsService.update(id, dto);
  }

  @Permissions('consent.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.consentsService.remove(id);
  }
}