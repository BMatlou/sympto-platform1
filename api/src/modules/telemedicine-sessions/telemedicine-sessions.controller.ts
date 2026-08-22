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

import { TelemedicineSessionsService } from './telemedicine-sessions.service';

import { CreateTelemedicineSessionDto } from './dto/create-telemedicine-session.dto';
import { UpdateTelemedicineSessionDto } from './dto/update-telemedicine-session.dto';
import { QueryTelemedicineSessionDto } from './dto/query-telemedicine-session.dto';

@ApiTags('Telemedicine Sessions')
@ApiBearerAuth()
@Controller('telemedicine-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TelemedicineSessionsController {
  constructor(
    private readonly telemedicineSessionsService: TelemedicineSessionsService,
  ) {}

  @Permissions('telemedicine-session.create')
  @Post()
  create(
    @Body() dto: CreateTelemedicineSessionDto,
  ) {
    return this.telemedicineSessionsService.create(
      dto,
    );
  }

  @Permissions('telemedicine-session.read')
  @Get()
  findAll(
    @Query() query: QueryTelemedicineSessionDto,
  ) {
    return this.telemedicineSessionsService.findAll(
      query,
    );
  }

  @Permissions('telemedicine-session.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.telemedicineSessionsService.findOne(
      id,
    );
  }

  @Permissions('telemedicine-session.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTelemedicineSessionDto,
  ) {
    return this.telemedicineSessionsService.update(
      id,
      dto,
    );
  }

  @Permissions('telemedicine-session.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.telemedicineSessionsService.remove(
      id,
    );
  }
}