import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDiseaseRegistryDto } from './dto/create-disease-registry.dto';
import { UpdateDiseaseRegistryDto } from './dto/update-disease-registry.dto';
import { QueryDiseaseRegistryDto } from './dto/query-disease-registry.dto';

@Injectable()
export class DiseaseRegistriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDiseaseRegistryDto,
  ) {
    const existing =
      await this.prisma.diseaseRegistry.findUnique({
        where: {
          code: dto.code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Disease registry code already exists.',
      );
    }

    return this.prisma.diseaseRegistry.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        notifiable:
          dto.notifiable ?? false,
        reportingWindowHours:
          dto.reportingWindowHours,
      },
    });
  }

  async findAll(
    query: QueryDiseaseRegistryDto,
  ) {
    const {
      page,
      limit,
      notifiable,
      search,
    } = query;

    const where: Prisma.DiseaseRegistryWhereInput =
      {
        ...(notifiable !== undefined && {
          notifiable,
        }),

        ...(search && {
          OR: [
            {
              code: {
                contains: search,
                mode:
                  Prisma.QueryMode.insensitive,
              },
            },
            {
              name: {
                contains: search,
                mode:
                  Prisma.QueryMode.insensitive,
              },
            },
            {
              category: {
                contains: search,
                mode:
                  Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.diseaseRegistry.findMany({
          where,

          orderBy: {
            name: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.diseaseRegistry.count({
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
    const registry =
      await this.prisma.diseaseRegistry.findUnique({
        where: {
          id,
        },
      });

    if (!registry) {
      throw new NotFoundException(
        'Disease registry not found.',
      );
    }

    return registry;
  }

  async update(
    id: string,
    dto: UpdateDiseaseRegistryDto,
  ) {
    await this.findOne(id);

    if (dto.code) {
      const existing =
        await this.prisma.diseaseRegistry.findFirst({
          where: {
            code: dto.code,
            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'Another disease registry already uses this code.',
        );
      }
    }

    return this.prisma.diseaseRegistry.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        notifiable: dto.notifiable,
        reportingWindowHours:
          dto.reportingWindowHours,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.diseaseRegistry.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Disease registry deleted successfully.',
    };
  }
}