import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabMethodDto } from './dto/create-lab-method.dto';
import { UpdateLabMethodDto } from './dto/update-lab-method.dto';
import { QueryLabMethodDto } from './dto/query-lab-method.dto';

@Injectable()
export class LabMethodsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabMethodDto,
  ) {
    return this.prisma.labMethod.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        labTests: true,
      },
    });
  }

  async findAll(
    query: QueryLabMethodDto,
  ) {
    const {
      page,
      limit,
      search,
      active,
    } = query;

    const where: Prisma.LabMethodWhereInput = {
      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
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
        this.prisma.labMethod.findMany({
          where,

          include: {
            labTests: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labMethod.count({
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
    const method =
      await this.prisma.labMethod.findUnique({
        where: {
          id,
        },

        include: {
          labTests: true,
        },
      });

    if (!method) {
      throw new NotFoundException(
        'Lab method not found.',
      );
    }

    return method;
  }

  async update(
    id: string,
    dto: UpdateLabMethodDto,
  ) {
    await this.findOne(id);

    return this.prisma.labMethod.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        labTests: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labMethod.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab method deleted successfully.',
    };
  }
}