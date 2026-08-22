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

import { AppointmentParticipantsService } from './appointment-participants.service';

import { CreateAppointmentParticipantDto } from './dto/create-appointment-participant.dto';
import { UpdateAppointmentParticipantDto } from './dto/update-appointment-participant.dto';
import { QueryAppointmentParticipantDto } from './dto/query-appointment-participant.dto';

@ApiTags('Appointment Participants')
@ApiBearerAuth()
@Controller('appointment-participants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentParticipantsController {
  constructor(
    private readonly appointmentParticipantsService: AppointmentParticipantsService,
  ) {}

  @Permissions('appointment-participant.create')
  @Post()
  create(@Body() dto: CreateAppointmentParticipantDto) {
    return this.appointmentParticipantsService.create(dto);
  }

  @Permissions('appointment-participant.read')
  @Get()
  findAll(@Query() query: QueryAppointmentParticipantDto) {
    return this.appointmentParticipantsService.findAll(query);
  }

  @Permissions('appointment-participant.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentParticipantsService.findOne(id);
  }

  @Permissions('appointment-participant.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentParticipantDto,
  ) {
    return this.appointmentParticipantsService.update(id, dto);
  }

  @Permissions('appointment-participant.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentParticipantsService.remove(id);
  }
}