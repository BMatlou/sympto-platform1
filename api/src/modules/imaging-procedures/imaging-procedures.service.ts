import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingProcedureDto } from './dto/create-imaging-procedure.dto';
import { UpdateImagingProcedureDto } from './dto/update-imaging-procedure.dto';
import { QueryImagingProcedureDto } from './dto/query-imaging-procedure.dto';

@Injectable()
export class ImagingProceduresService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingProcedureDto,
  ) {
    return this.prisma.imagingProcedure.create({
      data: {
        code: dto.code,
        name: dto.name,
        modality: dto.modality,
        description: dto.description,
        active: dto.active,
      },

      include: {
        orderItems: true,
      },
    });
  }

  async findAll(
    query: QueryImagingProcedureDto,
  ) {
    const {
      page,
      limit,
      search,
      active,
    } = query;

    const where: Prisma.ImagingProcedureWhereInput =
      {
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
            {

            },
          ],
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingProcedure.findMany({
          where,

          include: {
            orderItems: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingProcedure.count({
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
    const procedure =
      await this.prisma.imagingProcedure.findUnique({
        where: {
          id,
        },

        include: {
          orderItems: true,
        },
      });

    if (!procedure) {
      throw new NotFoundException(
        'Imaging procedure not found.',
      );
    }

    return procedure;
  }

  async update(
    id: string,
    dto: UpdateImagingProcedureDto,
  ) {
    await this.findOne(id);

    return this.prisma.imagingProcedure.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        modality: dto.modality,
        description: dto.description,
        active: dto.active,
      },

      include: {
        orderItems: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingProcedure.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging procedure deleted successfully.',
    };
  }
}