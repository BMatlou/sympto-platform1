import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferralNoteDto } from './dto/create-referral-note.dto';
import { UpdateReferralNoteDto } from './dto/update-referral-note.dto';
import { QueryReferralNoteDto } from './dto/query-referral-note.dto';

@Injectable()
export class ReferralNotesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferralNoteDto,
  ) {
    const referral =
      await this.prisma.referral.findUnique({
        where: {
          id: dto.referralId,
        },
      });

    if (!referral) {
      throw new NotFoundException(
        'Referral not found.',
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

    return this.prisma.referralNote.create({
      data: {
        referralId: dto.referralId,
        authorId: dto.authorId,
        note: dto.note,
      },

      include: {
        referral: true,
        author: true,
      },
    });
  }

  async findAll(
    query: QueryReferralNoteDto,
  ) {
    const {
      page,
      limit,
      referralId,
      authorId,
    } = query;

    const where: Prisma.ReferralNoteWhereInput =
      {
        ...(referralId && {
          referralId,
        }),

        ...(authorId && {
          authorId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referralNote.findMany({
          where,

          include: {
            referral: true,
            author: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referralNote.count({
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
      await this.prisma.referralNote.findUnique({
        where: {
          id,
        },

        include: {
          referral: true,
          author: true,
        },
      });

    if (!note) {
      throw new NotFoundException(
        'Referral note not found.',
      );
    }

    return note;
  }

  async update(
    id: string,
    dto: UpdateReferralNoteDto,
  ) {
    await this.findOne(id);

    if (dto.referralId) {
      const referral =
        await this.prisma.referral.findUnique({
          where: {
            id: dto.referralId,
          },
        });

      if (!referral) {
        throw new NotFoundException(
          'Referral not found.',
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

    return this.prisma.referralNote.update({
      where: {
        id,
      },

      data: {
        referralId: dto.referralId,
        authorId: dto.authorId,
        note: dto.note,
      },

      include: {
        referral: true,
        author: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.referralNote.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Referral note deleted successfully.',
    };
  }
}