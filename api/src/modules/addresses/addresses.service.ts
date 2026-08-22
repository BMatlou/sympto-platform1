import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAddressDto,
  ) {
    if (dto.countryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.countryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Country not found.',
        );
      }
    }

    return this.prisma.address.create({
      data: {
        line1: dto.line1,
        line2: dto.line2,
        suburb: dto.suburb,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        countryId: dto.countryId,
      },

      include: {
        country: true,
      },
    });
  }

  async findAll(
    query: QueryAddressDto,
  ) {
    const {
      page,
      limit,
      countryId,
      city,
      search,
    } = query;

    const where: Prisma.AddressWhereInput = {
      ...(countryId && {
        countryId,
      }),

      ...(city && {
        city: {
          contains: city,
          mode: Prisma.QueryMode.insensitive,
        },
      }),

      ...(search && {
        OR: [
          {
            line1: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            line2: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            suburb: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            city: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            province: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            postalCode: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.address.findMany({
          where,

          include: {
            country: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.address.count({
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
    const address =
      await this.prisma.address.findUnique({
        where: {
          id,
        },

        include: {
          country: true,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Address not found.',
      );
    }

    return address;
  }

  async update(
    id: string,
    dto: UpdateAddressDto,
  ) {
    await this.findOne(id);

    if (dto.countryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.countryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Country not found.',
        );
      }
    }

    return this.prisma.address.update({
      where: {
        id,
      },

      data: {
        line1: dto.line1,
        line2: dto.line2,
        suburb: dto.suburb,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        countryId: dto.countryId,
      },

      include: {
        country: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.address.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Address deleted successfully.',
    };
  }
}