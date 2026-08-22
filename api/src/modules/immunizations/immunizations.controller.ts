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

import { ImmunizationsService } from './immunizations.service';

import { CreateImmunizationDto } from './dto/create-immunization.dto';
import { UpdateImmunizationDto } from './dto/update-immunization.dto';
import { QueryImmunizationDto } from './dto/query-immunization.dto';

@ApiTags('Immunizations')
@ApiBearerAuth()
@Controller('immunizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImmunizationsController {
  constructor(
    private readonly immunizationsService: ImmunizationsService,
  ) {}

  @Permissions('immunization.create')
  @Post()
  create(@Body() dto: CreateImmunizationDto) {
    return this.immunizationsService.create(dto);
  }

 @Get()
findAll(@Query() query: QueryImmunizationDto) {
  return this.immunizationsService.findAll(query);
}

  @Permissions('immunization.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.immunizationsService.findOne(id);
  }

  @Permissions('immunization.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImmunizationDto,
  ) {
    return this.immunizationsService.update(id, dto);
  }

  @Permissions('immunization.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.immunizationsService.remove(id);
  }
}