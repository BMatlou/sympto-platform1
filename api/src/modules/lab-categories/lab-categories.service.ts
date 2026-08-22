import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabCategoryDto } from './dto/create-lab-category.dto';
import { UpdateLabCategoryDto } from './dto/update-lab-category.dto';
import { QueryLabCategoryDto } from './dto/query-lab-category.dto';

@Injectable()
export class LabCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabCategoryDto,
  ) {
    const discipline =
      await this.prisma.labDiscipline.findUnique({
        where: {
          id: dto.disciplineId,
        },
      });

    if (!discipline) {
      throw new NotFoundException(
        'Lab discipline not found.',
      );
    }

    return this.prisma.labCategory.create({
      data: {
        disciplineId: dto.disciplineId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        discipline: true,
        tests: true,
      },
    });
  }

  async findAll(
    query: QueryLabCategoryDto,
  ) {
    const {
      page,
      limit,
      disciplineId,
      search,
      active,
    } = query;

    const where: Prisma.LabCategoryWhereInput = {
      ...(disciplineId && {
        disciplineId,
      }),

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
        this.prisma.labCategory.findMany({
          where,

          include: {
            discipline: true,
            tests: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labCategory.count({
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
    const category =
      await this.prisma.labCategory.findUnique({
        where: {
          id,
        },

        include: {
          discipline: true,
          tests: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Lab category not found.',
      );
    }

    return category;
  }

  async update(
    id: string,
    dto: UpdateLabCategoryDto,
  ) {
    await this.findOne(id);

    if (dto.disciplineId) {
      const discipline =
        await this.prisma.labDiscipline.findUnique({
          where: {
            id: dto.disciplineId,
          },
        });

      if (!discipline) {
        throw new NotFoundException(
          'Lab discipline not found.',
        );
      }
    }

    return this.prisma.labCategory.update({
      where: {
        id,
      },

      data: {
        disciplineId: dto.disciplineId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        discipline: true,
        tests: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labCategory.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab category deleted successfully.',
    };
  }
}