import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInsuranceProviderDto } from './dto/create-insurance-provider.dto';
import { QueryInsuranceProviderDto } from './dto/query-insurance-provider.dto';
import { UpdateInsuranceProviderDto } from './dto/update-insurance-provider.dto';

@Injectable()
export class InsuranceProvidersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInsuranceProviderDto,
  ) {
    const existing =
      await this.prisma.insuranceProvider.findUnique({
        where: {
          code: dto.code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Insurance provider code already exists.',
      );
    }

    return this.prisma.insuranceProvider.create({
      data: {
        code: dto.code,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
      },
    });
  }

    async findAll(
    query: QueryInsuranceProviderDto,
  ) {
    const {
      page,
      limit,
      search,
      type,
      active,
    } = query;

    const where: Prisma.InsuranceProviderWhereInput = {
      ...(type && {
        type,
      }),

      ...(active !== undefined && {
        active,
      }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.insuranceProvider.findMany({
          where,

          include: {
            policies: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.insuranceProvider.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const provider =
      await this.prisma.insuranceProvider.findUnique({
        where: {
          id,
        },

        include: {
          policies: true,
        },
      });

    if (!provider) {
      throw new NotFoundException(
        'Insurance provider not found.',
      );
    }

    return provider;
  }

    async update(
    id: string,
    dto: UpdateInsuranceProviderDto,
  ) {
    const existing =
      await this.prisma.insuranceProvider.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance provider not found.',
      );
    }

    if (
      dto.code &&
      dto.code !== existing.code
    ) {
      const duplicate =
        await this.prisma.insuranceProvider.findUnique({
          where: {
            code: dto.code,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Insurance provider code already exists.',
        );
      }
    }

    return this.prisma.insuranceProvider.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        active: dto.active,
      },

      include: {
        policies: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const provider =
      await this.prisma.insuranceProvider.findUnique({
        where: {
          id,
        },
      });

    if (!provider) {
      throw new NotFoundException(
        'Insurance provider not found.',
      );
    }

    await this.prisma.insuranceProvider.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Insurance provider deleted successfully.',
    };
  }
}