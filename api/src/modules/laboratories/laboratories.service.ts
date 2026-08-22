import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { QueryLaboratoryDto } from './dto/query-laboratory.dto';

@Injectable()
export class LaboratoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLaboratoryDto,
  ) {
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

    return this.prisma.laboratory.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        practiceId: dto.practiceId,
        active: dto.active,
      },

      include: {
        practice: true,
        audits: true,
        instruments: true,
        orders: true,
      },
    });
  }

  async findAll(
    query: QueryLaboratoryDto,
  ) {
    const {
      page,
      limit,
      practiceId,
      search,
      active,
    } = query;

    const where: Prisma.LaboratoryWhereInput = {
      ...(practiceId && {
        practiceId,
      }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
            },
          },
        ],
      }),

      ...(active !== undefined && {
        active,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.laboratory.findMany({
          where,

          include: {
            practice: true,
            audits: true,
            instruments: true,
            orders: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.laboratory.count({
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
    const laboratory =
      await this.prisma.laboratory.findUnique({
        where: {
          id,
        },

        include: {
          practice: true,
          audits: true,
          instruments: true,
          orders: true,
        },
      });

    if (!laboratory) {
      throw new NotFoundException(
        'Laboratory not found.',
      );
    }

    return laboratory;
  }

  async update(
    id: string,
    dto: UpdateLaboratoryDto,
  ) {
    await this.findOne(id);

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

    return this.prisma.laboratory.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        practiceId: dto.practiceId,
        active: dto.active,
      },

      include: {
        practice: true,
        audits: true,
        instruments: true,
        orders: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.laboratory.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Laboratory deleted successfully.',
    };
  }
}