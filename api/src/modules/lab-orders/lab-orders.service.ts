import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { QueryLabOrderDto } from './dto/query-lab-order.dto';

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabOrderDto,
  ) {
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

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    if (dto.appointmentId) {
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

    if (dto.laboratoryId) {
      const laboratory =
        await this.prisma.laboratory.findUnique({
          where: {
            id: dto.laboratoryId,
          },
        });

      if (!laboratory) {
        throw new NotFoundException(
          'Laboratory not found.',
        );
      }
    }

    return this.prisma.labOrder.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        appointmentId: dto.appointmentId,
        practitionerId: dto.practitionerId,
        laboratoryId: dto.laboratoryId,
        orderNumber: dto.orderNumber,
        status: dto.status,
        clinicalNotes: dto.clinicalNotes,
        orderedAt: dto.orderedAt
          ? new Date(dto.orderedAt)
          : undefined,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
        encounter: true,
        appointment: true,
        practitioner: true,
        laboratory: true,
        items: true,
        specimens: true,
      },
    });
  }

  async findAll(
    query: QueryLabOrderDto,
  ) {
    const {
      page,
      limit,
      patientId,
      encounterId,
      practitionerId,
      laboratoryId,
    } = query;

    const where = {
      ...(patientId && {
        patientId,
      }),
      ...(encounterId && {
        encounterId,
      }),
      ...(practitionerId && {
        practitionerId,
      }),
      ...(laboratoryId && {
        laboratoryId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labOrder.findMany({
          where,

          include: {
            patient: {
              include: {
                person: true,
              },
            },
            encounter: true,
            appointment: true,
            practitioner: true,
            laboratory: true,
            items: true,
            specimens: true,
          },

          orderBy: {
            orderedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labOrder.count({
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
    const order =
      await this.prisma.labOrder.findUnique({
        where: {
          id,
        },

        include: {
          patient: {
            include: {
              person: true,
            },
          },
          encounter: true,
          appointment: true,
          practitioner: true,
          laboratory: true,
          items: true,
          specimens: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Lab order not found.',
      );
    }

    return order;
  }

  async update(
    id: string,
    dto: UpdateLabOrderDto,
  ) {
    await this.findOne(id);

    return this.prisma.labOrder.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        appointmentId: dto.appointmentId,
        practitionerId: dto.practitionerId,
        laboratoryId: dto.laboratoryId,
        orderNumber: dto.orderNumber,
        status: dto.status,
        clinicalNotes: dto.clinicalNotes,
        orderedAt: dto.orderedAt
          ? new Date(dto.orderedAt)
          : undefined,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
        encounter: true,
        appointment: true,
        practitioner: true,
        laboratory: true,
        items: true,
        specimens: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labOrder.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab order deleted successfully.',
    };
  }
}