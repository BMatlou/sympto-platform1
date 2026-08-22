import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateAppointmentParticipantDto } from './dto/create-appointment-participant.dto';
import { UpdateAppointmentParticipantDto } from './dto/update-appointment-participant.dto';
import { QueryAppointmentParticipantDto } from './dto/query-appointment-participant.dto';

@Injectable()
export class AppointmentParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAppointmentParticipantDto,
  ) {
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

    const person =
      await this.prisma.person.findUnique({
        where: {
          id: dto.personId,
        },
      });

    if (!person) {
      throw new NotFoundException(
        'Person not found.',
      );
    }

    const existing =
      await this.prisma.appointmentParticipant.findFirst({
        where: {
          appointmentId: dto.appointmentId,
          personId: dto.personId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Participant already exists for this appointment.',
      );
    }

    return this.prisma.appointmentParticipant.create({
      data: {
        appointmentId: dto.appointmentId,
        personId: dto.personId,
        role: dto.role.trim(),
      },

      include: {
        appointment: true,
        person: true,
      },
    });
  }

  async findAll(
    query: QueryAppointmentParticipantDto,
  ) {
    const {
      page = 1,
      limit = 20,
      appointmentId,
      personId,
    } = query;

    const where: any = {};

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    if (personId) {
      where.personId = personId;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.appointmentParticipant.findMany({
          where,

          include: {
            appointment: true,
            person: true,
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.appointmentParticipant.count({
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
    const participant =
      await this.prisma.appointmentParticipant.findUnique({
        where: {
          id,
        },

        include: {
          appointment: true,
          person: true,
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Appointment participant not found.',
      );
    }

    return participant;
  }

  async update(
    id: string,
    dto: UpdateAppointmentParticipantDto,
  ) {
    await this.findOne(id);

    return this.prisma.appointmentParticipant.update({
      where: {
        id,
      },

      data: {
        role: dto.role?.trim(),
      },

      include: {
        appointment: true,
        person: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.appointmentParticipant.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Appointment participant deleted successfully.',
    };
  }
}