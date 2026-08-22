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

import { PractitionerAvailabilityService } from './practitioner-availability.service';

import { CreatePractitionerAvailabilityDto } from './dto/create-practitioner-availability.dto';
import { UpdatePractitionerAvailabilityDto } from './dto/update-practitioner-availability.dto';
import { QueryPractitionerAvailabilityDto } from './dto/query-practitioner-availability.dto';

@ApiTags('Practitioner Availability')
@ApiBearerAuth()
@Controller('practitioner-availability')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PractitionerAvailabilityController {
  constructor(
    private readonly practitionerAvailabilityService: PractitionerAvailabilityService,
  ) {}

  @Permissions('practitioner-availability.create')
  @Post()
  create(@Body() dto: CreatePractitionerAvailabilityDto) {
    return this.practitionerAvailabilityService.create(dto);
  }

  @Permissions('practitioner-availability.read')
  @Get()
  findAll(@Query() query: QueryPractitionerAvailabilityDto) {
    return this.practitionerAvailabilityService.findAll(query);
  }

  @Permissions('practitioner-availability.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.practitionerAvailabilityService.findOne(id);
  }

  @Permissions('practitioner-availability.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerAvailabilityDto,
  ) {
    return this.practitionerAvailabilityService.update(id, dto);
  }

  @Permissions('practitioner-availability.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.practitionerAvailabilityService.remove(id);
  }
}