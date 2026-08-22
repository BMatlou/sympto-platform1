import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabDisciplineDto } from './dto/create-lab-discipline.dto';
import { UpdateLabDisciplineDto } from './dto/update-lab-discipline.dto';
import { QueryLabDisciplineDto } from './dto/query-lab-discipline.dto';

@Injectable()
export class LabDisciplinesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabDisciplineDto,
  ) {
    return this.prisma.labDiscipline.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },
      include: {
        categories: true,
      },
    });
  }

  async findAll(
    query: QueryLabDisciplineDto,
  ) {
    const {
      page,
      limit,
      search,
      active,
    } = query;

    const where: Prisma.LabDisciplineWhereInput = {
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
        this.prisma.labDiscipline.findMany({
          where,
          include: {
            categories: true,
          },
          orderBy: {
            name: 'asc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.labDiscipline.count({
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
    const discipline =
      await this.prisma.labDiscipline.findUnique({
        where: {
          id,
        },
        include: {
          categories: true,
        },
      });

    if (!discipline) {
      throw new NotFoundException(
        'Lab discipline not found.',
      );
    }

    return discipline;
  }

  async update(
    id: string,
    dto: UpdateLabDisciplineDto,
  ) {
    await this.findOne(id);

    return this.prisma.labDiscipline.update({
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
        categories: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labDiscipline.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab discipline deleted successfully.',
    };
  }
}