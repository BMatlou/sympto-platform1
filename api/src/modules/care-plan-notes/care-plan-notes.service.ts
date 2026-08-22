import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCarePlanNoteDto } from './dto/create-care-plan-note.dto';
import { UpdateCarePlanNoteDto } from './dto/update-care-plan-note.dto';
import { QueryCarePlanNoteDto } from './dto/query-care-plan-note.dto';

@Injectable()
export class CarePlanNotesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCarePlanNoteDto,
  ) {
    const carePlan =
      await this.prisma.carePlan.findUnique({
        where: {
          id: dto.carePlanId,
        },
      });

    if (!carePlan) {
      throw new NotFoundException(
        'Care plan not found.',
      );
    }

    const author =
      await this.prisma.user.findUnique({
        where: {
          id: dto.authorId,
        },
      });

    if (!author) {
      throw new NotFoundException(
        'Author not found.',
      );
    }

    return this.prisma.carePlanNote.create({
      data: {
        carePlanId: dto.carePlanId,
        authorId: dto.authorId,
        note: dto.note,
      },

      include: {
        carePlan: true,
        author: true,
      },
    });
  }

  async findAll(
    query: QueryCarePlanNoteDto,
  ) {
    const {
      page,
      limit,
      carePlanId,
      authorId,
    } = query;

    const where: Prisma.CarePlanNoteWhereInput =
      {
        ...(carePlanId && {
          carePlanId,
        }),

        ...(authorId && {
          authorId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.carePlanNote.findMany({
          where,

          include: {
            carePlan: true,
            author: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.carePlanNote.count({
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
    const note =
      await this.prisma.carePlanNote.findUnique({
        where: {
          id,
        },

        include: {
          carePlan: true,
          author: true,
        },
      });

    if (!note) {
      throw new NotFoundException(
        'Care plan note not found.',
      );
    }

    return note;
  }

  async update(
    id: string,
    dto: UpdateCarePlanNoteDto,
  ) {
    await this.findOne(id);

    if (dto.carePlanId) {
      const carePlan =
        await this.prisma.carePlan.findUnique({
          where: {
            id: dto.carePlanId,
          },
        });

      if (!carePlan) {
        throw new NotFoundException(
          'Care plan not found.',
        );
      }
    }

    if (dto.authorId) {
      const author =
        await this.prisma.user.findUnique({
          where: {
            id: dto.authorId,
          },
        });

      if (!author) {
        throw new NotFoundException(
          'Author not found.',
        );
      }
    }

    return this.prisma.carePlanNote.update({
      where: {
        id,
      },

      data: {
        carePlanId: dto.carePlanId,
        authorId: dto.authorId,
        note: dto.note,
      },

      include: {
        carePlan: true,
        author: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.carePlanNote.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Care plan note deleted successfully.',
    };
  }
}