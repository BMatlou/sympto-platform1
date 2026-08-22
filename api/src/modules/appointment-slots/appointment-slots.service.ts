import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AvailabilityStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAppointmentSlotDto } from './dto/create-appointment-slot.dto';
import { UpdateAppointmentSlotDto } from './dto/update-appointment-slot.dto';
import { QueryAppointmentSlotDto } from './dto/query-appointment-slot.dto';

@Injectable()
export class AppointmentSlotsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAppointmentSlotDto) {
    const availability =
      await this.prisma.practitionerAvailability.findUnique({
        where: {
          id: dto.availabilityId,
        },
      });

    if (!availability) {
      throw new NotFoundException(
        'Practitioner availability not found.',
      );
    }

    if (
      new Date(dto.end) <=
      new Date(dto.start)
    ) {
      throw new BadRequestException(
        'End must be after start.',
      );
    }

    return this.prisma.appointmentSlot.create({
      data: {
        availabilityId: dto.availabilityId,
        start: new Date(dto.start),
        end: new Date(dto.end),
        status:
          dto.status ??
          AvailabilityStatus.AVAILABLE,
      },

      include: {
        availability: {
          include: {
            practitioner: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryAppointmentSlotDto,
  ) {
    const {
      page = 1,
      limit = 20,
      availabilityId,
      status,
    } = query;

    const where: Prisma.AppointmentSlotWhereInput =
      {};

    if (availabilityId) {
      where.availabilityId =
        availabilityId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.appointmentSlot.findMany({
          where,

          include: {
            availability: {
              include: {
                practitioner: true,
              },
            },
          },

          orderBy: {
            start: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.appointmentSlot.count({
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
    const slot =
      await this.prisma.appointmentSlot.findUnique({
        where: { id },

        include: {
          availability: {
            include: {
              practitioner: true,
            },
          },
        },
      });

    if (!slot) {
      throw new NotFoundException(
        'Appointment slot not found.',
      );
    }

    return slot;
  }

  async update(
    id: string,
    dto: UpdateAppointmentSlotDto,
  ) {
    await this.findOne(id);

    if (
      dto.start &&
      dto.end &&
      new Date(dto.end) <=
        new Date(dto.start)
    ) {
      throw new BadRequestException(
        'End must be after start.',
      );
    }

    return this.prisma.appointmentSlot.update({
      where: {
        id,
      },

      data: {
        start: dto.start
          ? new Date(dto.start)
          : undefined,
        end: dto.end
          ? new Date(dto.end)
          : undefined,
        status: dto.status,
      },

      include: {
        availability: {
          include: {
            practitioner: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.appointmentSlot.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Appointment slot deleted successfully.',
    };
  }
}