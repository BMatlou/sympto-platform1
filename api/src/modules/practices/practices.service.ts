import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePracticeDto } from './dto/create-practice.dto';
import { UpdatePracticeDto } from './dto/update-practice.dto';
import { QueryPracticeDto } from './dto/query-practice.dto';

@Injectable()
export class PracticesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePracticeDto,
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

    if (dto.addressId) {
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: dto.addressId,
          },
        });

      if (!address) {
        throw new NotFoundException(
          'Address not found.',
        );
      }
    }

    if (dto.organizationId) {
      const organization =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.organizationId,
          },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    const existing =
      await this.prisma.practice.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A practice with this name already exists for this practitioner.',
      );
    }

    return this.prisma.practice.create({
      data: {
        practitionerId: dto.practitionerId,
        name: dto.name.trim(),
        addressId: dto.addressId,
        phone: dto.phone,
        email: dto.email,
        organizationId: dto.organizationId,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },
        address: true,
        organization: true,
        locations: true,
        _count: {
          select: {
            appointments: true,
            referralsSent: true,
            referralsReceived: true,
            laboratories: true,
            imagingCenters: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryPracticeDto,
  ) {
    const {
      page,
      limit,
      practitionerId,
      organizationId,
      search,
    } = query;

    const where: Prisma.PracticeWhereInput = {
      ...(practitionerId && {
        practitionerId,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practice.findMany({
          where,

          include: {
            practitioner: {
              include: {
                person: true,
                department: true,
              },
            },
            address: true,
            organization: true,
            locations: true,

            _count: {
              select: {
                appointments: true,
                referralsSent: true,
                referralsReceived: true,
                laboratories: true,
                imagingCenters: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.practice.count({
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

  async findOne(
    id: string,
  ) {
    const practice =
      await this.prisma.practice.findUnique({
        where: {
          id,
        },

        include: {
          practitioner: {
            include: {
              person: true,
              department: true,
            },
          },

          address: true,
          organization: true,
          locations: true,

          appointments: true,
          referralsSent: true,
          referralsReceived: true,
          laboratories: true,
          imagingCenters: true,
        },
      });

    if (!practice) {
      throw new NotFoundException(
        'Practice not found.',
      );
    }

    return practice;
  }

  async update(
    id: string,
    dto: UpdatePracticeDto,
  ) {
    const existing =
      await this.findOne(id);

    const practitionerId =
      dto.practitionerId ??
      existing.practitionerId;

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

    if (dto.addressId) {
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: dto.addressId,
          },
        });

      if (!address) {
        throw new NotFoundException(
          'Address not found.',
        );
      }
    }

    if (dto.organizationId) {
      const organization =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.organizationId,
          },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    if (dto.name) {
      const duplicate =
        await this.prisma.practice.findFirst({
          where: {
            id: {
              not: id,
            },

            practitionerId,

            name: {
              equals: dto.name.trim(),
              mode: 'insensitive',
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'A practice with this name already exists for this practitioner.',
        );
      }
    }

    return this.prisma.practice.update({
      where: {
        id,
      },

      data: {
        practitionerId,
        name: dto.name?.trim(),
        addressId: dto.addressId,
        phone: dto.phone,
        email: dto.email,
        organizationId: dto.organizationId,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },

        address: true,
        organization: true,
        locations: true,

        _count: {
          select: {
            appointments: true,
            referralsSent: true,
            referralsReceived: true,
            laboratories: true,
            imagingCenters: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.practice.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practice deleted successfully.',
    };
  }
}