import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAppointmentReminderDto } from './dto/create-appointment-reminder.dto';
import { QueryAppointmentReminderDto } from './dto/query-appointment-reminder.dto';
import { UpdateAppointmentReminderDto } from './dto/update-appointment-reminder.dto';

@Injectable()
export class AppointmentRemindersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAppointmentReminderDto) {
    const appointment =
      await this.prisma.appointment.findUnique({
        where: {
          id: dto.appointmentId,
        },
      });

    if (!appointment) {
      throw new NotFoundException(
        'Appointment not found.',
      );
    }

    if (
      new Date(dto.remindAt) >=
      appointment.scheduledStart
    ) {
      throw new BadRequestException(
        'Reminder must be scheduled before the appointment starts.',
      );
    }

    return this.prisma.appointmentReminder.create({
      data: {
        appointmentId: dto.appointmentId,
        remindAt: new Date(dto.remindAt),
        channel: dto.channel.trim(),
        sent: dto.sent ?? false,
      },

      include: {
        appointment: true,
      },
    });
  }

  async findAll(
    query: QueryAppointmentReminderDto,
  ) {
    const {
      page = 1,
      limit = 20,
      appointmentId,
      sent,
    } = query;

    const where: Prisma.AppointmentReminderWhereInput =
      {};

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    if (sent !== undefined) {
      where.sent = sent;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.appointmentReminder.findMany({
          where,

          include: {
            appointment: true,
          },

          orderBy: {
            remindAt: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.appointmentReminder.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  async findOne(id: string) {
    const reminder =
      await this.prisma.appointmentReminder.findUnique({
        where: {
          id,
        },

        include: {
          appointment: true,
        },
      });

    if (!reminder) {
      throw new NotFoundException(
        'Appointment reminder not found.',
      );
    }

    return reminder;
  }

  async update(
    id: string,
    dto: UpdateAppointmentReminderDto,
  ) {
    await this.findOne(id);

    return this.prisma.appointmentReminder.update({
      where: {
        id,
      },

      data: {
        remindAt: dto.remindAt
          ? new Date(dto.remindAt)
          : undefined,
        channel: dto.channel?.trim(),
        sent: dto.sent,
      },

      include: {
        appointment: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.appointmentReminder.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Appointment reminder deleted successfully.',
    };
  }
}