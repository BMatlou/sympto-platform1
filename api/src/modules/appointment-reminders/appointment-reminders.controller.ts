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

import { AppointmentRemindersService } from './appointment-reminders.service';

import { CreateAppointmentReminderDto } from './dto/create-appointment-reminder.dto';
import { UpdateAppointmentReminderDto } from './dto/update-appointment-reminder.dto';
import { QueryAppointmentReminderDto } from './dto/query-appointment-reminder.dto';

@ApiTags('Appointment Reminders')
@ApiBearerAuth()
@Controller('appointment-reminders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentRemindersController {
  constructor(
    private readonly appointmentRemindersService: AppointmentRemindersService,
  ) {}

  @Permissions('appointment-reminder.create')
  @Post()
  create(@Body() dto: CreateAppointmentReminderDto) {
    return this.appointmentRemindersService.create(dto);
  }

  @Permissions('appointment-reminder.read')
  @Get()
  findAll(@Query() query: QueryAppointmentReminderDto) {
    return this.appointmentRemindersService.findAll(query);
  }

  @Permissions('appointment-reminder.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentRemindersService.findOne(id);
  }

  @Permissions('appointment-reminder.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentReminderDto,
  ) {
    return this.appointmentRemindersService.update(id, dto);
  }

  @Permissions('appointment-reminder.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentRemindersService.remove(id);
  }
}