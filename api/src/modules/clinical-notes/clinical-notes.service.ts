import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';
import { QueryClinicalNoteDto } from './dto/query-clinical-note.dto';

@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClinicalNoteDto,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id: dto.encounterId,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found.',
      );
    }

    return this.prisma.clinicalNote.create({
      data: {
        encounterId: dto.encounterId,
        title: dto.title,
        note: dto.note,
      },

      include: {
        encounter: true,
      },
    });
  }

  async findAll(
    query: QueryClinicalNoteDto,
  ) {
    const {
      page,
      limit,
      encounterId,
    } = query;

    const where = encounterId
      ? {
          encounterId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.clinicalNote.findMany({
          where,

          include: {
            encounter: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.clinicalNote.count({
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
      await this.prisma.clinicalNote.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,
        },
      });

    if (!note) {
      throw new NotFoundException(
        'Clinical note not found.',
      );
    }

    return note;
  }

  async update(
    id: string,
    dto: UpdateClinicalNoteDto,
  ) {
    await this.findOne(id);

    return this.prisma.clinicalNote.update({
      where: {
        id,
      },

      data: {
        encounterId: dto.encounterId,
        title: dto.title,
        note: dto.note,
      },

      include: {
        encounter: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.clinicalNote.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Clinical note deleted successfully.',
    };
  }
}