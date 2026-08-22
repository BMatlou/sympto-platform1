import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { QueryPharmacyDto } from './dto/query-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';

@Injectable()
export class PharmaciesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePharmacyDto) {
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

    if (dto.registrationNumber) {
      const existing =
        await this.prisma.pharmacy.findFirst({
          where: {
            registrationNumber:
              dto.registrationNumber.trim(),
          },
        });

      if (existing) {
        throw new ConflictException(
          'Registration number already exists.',
        );
      }
    }

    return this.prisma.pharmacy.create({
      data: {
        name: dto.name.trim(),
        registrationNumber:
          dto.registrationNumber?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        addressId: dto.addressId,
      },

      include: {
        address: true,
        dispensations: true,
      },
    });
  }

  async findAll(
    query: QueryPharmacyDto,
  ) {
    const {
      page = 1,
      limit = 20,
      search,
    } = query;

    const where: Prisma.PharmacyWhereInput =
      {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          registrationNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.pharmacy.findMany({
          where,

          include: {
            address: true,
            _count: {
              select: {
                dispensations: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.pharmacy.count({
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
    const pharmacy =
      await this.prisma.pharmacy.findUnique({
        where: {
          id,
        },

        include: {
          address: true,
          dispensations: true,
        },
      });

    if (!pharmacy) {
      throw new NotFoundException(
        'Pharmacy not found.',
      );
    }

    return pharmacy;
  }

  async update(
    id: string,
    dto: UpdatePharmacyDto,
  ) {
    await this.findOne(id);

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

    return this.prisma.pharmacy.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
        registrationNumber:
          dto.registrationNumber?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        addressId: dto.addressId,
      },

      include: {
        address: true,
        dispensations: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.pharmacy.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Pharmacy deleted successfully.',
    };
  }
}