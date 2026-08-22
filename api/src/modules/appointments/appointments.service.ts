import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AppointmentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findOne(id: string) {
  const appointment =
    await this.prisma.appointment.findUnique({
      where: {
        id,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },

        practitioner: {
          include: {
            person: true,
          },
        },

        practice: true,
        encounter: true,
        participants: true,
        reminders: true,
      },
    });

  if (!appointment) {
    throw new NotFoundException(
      'Appointment not found.',
    );
  }

  return appointment;
}

async update(
  id: string,
  dto: UpdateAppointmentDto,
) {
  await this.findOne(id);

  if (dto.patientId) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }
  }

  if (dto.practitionerId) {
    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.practitionerId,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }
  }

  if (dto.practiceId) {
    const practice =
      await this.prisma.practice.findUnique({
        where: {
          id: dto.practiceId,
        },
      });

    if (!practice) {
      throw new NotFoundException(
        'Practice not found.',
      );
    }
  }

  if (
    dto.scheduledStart &&
    dto.scheduledEnd &&
    new Date(dto.scheduledEnd) <=
      new Date(dto.scheduledStart)
  ) {
    throw new BadRequestException(
      'Scheduled end must be after scheduled start.',
    );
  }

  return this.prisma.appointment.update({
    where: {
      id,
    },

    data: {
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
      practiceId: dto.practiceId,
      appointmentType:
        dto.appointmentType,
      scheduledStart: dto.scheduledStart
        ? new Date(dto.scheduledStart)
        : undefined,
      scheduledEnd: dto.scheduledEnd
        ? new Date(dto.scheduledEnd)
        : undefined,
      reason: dto.reason?.trim(),
      notes: dto.notes?.trim(),
    },

    include: {
      patient: {
        include: {
          person: true,
        },
      },

      practitioner: {
        include: {
          person: true,
        },
      },

      practice: true,
      encounter: true,
    },
  });
}

async remove(id: string) {
  await this.findOne(id);

  await this.prisma.appointment.delete({
    where: {
      id,
    },
  });

  return {
    message:
      'Appointment deleted successfully.',
  };
}

  async create(dto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id: dto.patientId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.practitionerId,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }

    if (dto.practiceId) {
      const practice =
        await this.prisma.practice.findUnique({
          where: {
            id: dto.practiceId,
          },
        });

      if (!practice) {
        throw new NotFoundException(
          'Practice not found.',
        );
      }
    }

    if (
      new Date(dto.scheduledEnd) <=
      new Date(dto.scheduledStart)
    ) {
      throw new BadRequestException(
        'Scheduled end must be after scheduled start.',
      );
    }

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        practiceId: dto.practiceId,
        appointmentType: dto.appointmentType,
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        reason: dto.reason?.trim(),
        notes: dto.notes?.trim(),
        status: AppointmentStatus.PENDING,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },

        practitioner: {
          include: {
            person: true,
          },
        },

        practice: true,
      },
    });
  }

  async findAll(
    query: QueryAppointmentDto,
  ) {
    const {
      page = 1,
      limit = 20,
      patientId,
      practitionerId,
      practiceId,
      status,
    } = query;

    const where: Prisma.AppointmentWhereInput = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (practitionerId) {
      where.practitionerId = practitionerId;
    }

    if (practiceId) {
      where.practiceId = practiceId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.appointment.findMany({
          where,

          include: {
            patient: {
              include: {
                person: true,
              },
            },

            practitioner: {
              include: {
                person: true,
              },
            },

            practice: true,
          },

          orderBy: {
            scheduledStart: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.appointment.count({
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
}