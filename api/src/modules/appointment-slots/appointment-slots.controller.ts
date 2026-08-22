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

import { AppointmentSlotsService } from './appointment-slots.service';

import { CreateAppointmentSlotDto } from './dto/create-appointment-slot.dto';
import { UpdateAppointmentSlotDto } from './dto/update-appointment-slot.dto';
import { QueryAppointmentSlotDto } from './dto/query-appointment-slot.dto';

@ApiTags('Appointment Slots')
@ApiBearerAuth()
@Controller('appointment-slots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentSlotsController {
  constructor(
    private readonly appointmentSlotsService: AppointmentSlotsService,
  ) {}

  @Permissions('appointment-slot.create')
  @Post()
  create(@Body() dto: CreateAppointmentSlotDto) {
    return this.appointmentSlotsService.create(dto);
  }

  @Permissions('appointment-slot.read')
  @Get()
  findAll(@Query() query: QueryAppointmentSlotDto) {
    return this.appointmentSlotsService.findAll(query);
  }

  @Permissions('appointment-slot.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentSlotsService.findOne(id);
  }

  @Permissions('appointment-slot.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentSlotDto,
  ) {
    return this.appointmentSlotsService.update(id, dto);
  }

  @Permissions('appointment-slot.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentSlotsService.remove(id);
  }
}