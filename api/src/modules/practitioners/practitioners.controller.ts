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

import { PractitionersService } from './practitioners.service';

import { CreatePractitionerDto } from './dto/create-practitioner.dto';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { QueryPractitionerDto } from './dto/query-practitioner.dto';

@ApiTags('Practitioners')
@ApiBearerAuth()
@Controller('practitioners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PractitionersController {
  constructor(
    private readonly practitionersService: PractitionersService,
  ) {}

  @Permissions('practitioner.create')
  @Post()
  create(@Body() dto: CreatePractitionerDto) {
    return this.practitionersService.create(dto);
  }

  @Permissions('practitioner.read')
  @Get()
  findAll(@Query() query: QueryPractitionerDto) {
    return this.practitionersService.findAll(query);
  }

  @Permissions('practitioner.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionersService.findOne(id);
  }

  @Permissions('practitioner.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerDto,
  ) {
    return this.practitionersService.update(id, dto);
  }

  @Permissions('practitioner.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practitionersService.remove(id);
  }
}