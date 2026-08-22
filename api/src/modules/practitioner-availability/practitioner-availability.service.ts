import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePractitionerAvailabilityDto } from './dto/create-practitioner-availability.dto';
import { UpdatePractitionerAvailabilityDto } from './dto/update-practitioner-availability.dto';
import { QueryPractitionerAvailabilityDto } from './dto/query-practitioner-availability.dto';

@Injectable()
export class PractitionerAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePractitionerAvailabilityDto,
  ) {
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

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        'Start time must be before end time.',
      );
    }

    const existing =
      await this.prisma.practitionerAvailability.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          weekday: dto.weekday,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Availability already exists.',
      );
    }

    return this.prisma.practitionerAvailability.create({
      data: {
        practitionerId: dto.practitionerId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        active: dto.active ?? true,
      },

      include: {
        practitioner: true,
        slots: true,
      },
    });
  }

  async findAll(
    query: QueryPractitionerAvailabilityDto,
  ) {
    const {
      page = 1,
      limit = 20,
      practitionerId,
      weekday,
    } = query;

    const where: Prisma.PractitionerAvailabilityWhereInput =
      {};

    if (practitionerId) {
      where.practitionerId =
        practitionerId;
    }

    if (weekday !== undefined) {
      where.weekday = weekday;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practitionerAvailability.findMany({
          where,

          include: {
            practitioner: true,
            slots: true,
          },

          orderBy: [
            {
              weekday: 'asc',
            },
            {
              startTime: 'asc',
            },
          ],

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.practitionerAvailability.count({
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
    const availability =
      await this.prisma.practitionerAvailability.findUnique({
        where: {
          id,
        },

        include: {
          practitioner: true,
          slots: true,
        },
      });

    if (!availability) {
      throw new NotFoundException(
        'Practitioner availability not found.',
      );
    }

    return availability;
  }

  async update(
    id: string,
    dto: UpdatePractitionerAvailabilityDto,
  ) {
    await this.findOne(id);

    if (
      dto.startTime &&
      dto.endTime &&
      dto.startTime >= dto.endTime
    ) {
      throw new BadRequestException(
        'Start time must be before end time.',
      );
    }

    return this.prisma.practitionerAvailability.update({
      where: {
        id,
      },

      data: {
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        active: dto.active,
      },

      include: {
        practitioner: true,
        slots: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.practitionerAvailability.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practitioner availability deleted successfully.',
    };
  }
}