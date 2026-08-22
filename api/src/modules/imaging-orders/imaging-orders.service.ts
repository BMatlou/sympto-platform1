import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingOrderDto } from './dto/create-imaging-order.dto';
import { UpdateImagingOrderDto } from './dto/update-imaging-order.dto';
import { QueryImagingOrderDto } from './dto/query-imaging-order.dto';

@Injectable()
export class ImagingOrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingOrderDto,
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

    if (dto.imagingCenterId) {
      const imagingCenter =
        await this.prisma.imagingCenter.findUnique({
          where: {
            id: dto.imagingCenterId,
          },
        });

      if (!imagingCenter) {
        throw new NotFoundException(
          'Imaging center not found.',
        );
      }
    }

    return this.prisma.imagingOrder.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        encounterId: dto.encounterId,
        appointmentId: dto.appointmentId,
        imagingCenterId: dto.imagingCenterId,
        orderNumber: dto.orderNumber,
        priority: dto.priority,
        status: dto.status,
        clinicalIndication:
          dto.clinicalIndication,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        appointment: true,
        imagingCenter: true,
        items: true,
        studies: true,
      },
    });
  }

  async findAll(
    query: QueryImagingOrderDto,
  ) {
    const {
      page,
      limit,
      patientId,
      practitionerId,
      imagingCenterId,
      search,
    } = query;

    const where: Prisma.ImagingOrderWhereInput =
      {
        ...(patientId && {
          patientId,
        }),

        ...(practitionerId && {
          practitionerId,
        }),

        ...(imagingCenterId && {
          imagingCenterId,
        }),

        ...(search && {
          orderNumber: {
            contains: search,
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingOrder.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            encounter: true,
            appointment: true,
            imagingCenter: true,
            items: true,
            studies: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingOrder.count({
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
      await this.prisma.imagingOrder.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          encounter: true,
          appointment: true,
          imagingCenter: true,
          items: {
            include: {
              procedure: true,
            },
          },
          studies: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Imaging order not found.',
      );
    }

    return order;
  }

  async update(
    id: string,
    dto: UpdateImagingOrderDto,
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

    if (dto.imagingCenterId) {
      const imagingCenter =
        await this.prisma.imagingCenter.findUnique({
          where: {
            id: dto.imagingCenterId,
          },
        });

      if (!imagingCenter) {
        throw new NotFoundException(
          'Imaging center not found.',
        );
      }
    }

    return this.prisma.imagingOrder.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        encounterId: dto.encounterId,
        appointmentId: dto.appointmentId,
        imagingCenterId: dto.imagingCenterId,
        orderNumber: dto.orderNumber,
        priority: dto.priority,
        status: dto.status,
        clinicalIndication:
          dto.clinicalIndication,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        appointment: true,
        imagingCenter: true,
        items: true,
        studies: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingOrder.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging order deleted successfully.',
    };
  }
}