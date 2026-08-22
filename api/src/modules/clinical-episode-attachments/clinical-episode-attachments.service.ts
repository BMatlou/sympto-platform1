import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClinicalEpisodeAttachmentDto } from './dto/create-clinical-episode-attachment.dto';
import { UpdateClinicalEpisodeAttachmentDto } from './dto/update-clinical-episode-attachment.dto';
import { QueryClinicalEpisodeAttachmentDto } from './dto/query-clinical-episode-attachment.dto';

@Injectable()
export class ClinicalEpisodeAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClinicalEpisodeAttachmentDto,
  ) {
    return this.prisma.clinicalEpisodeAttachment.create({
      data: dto,

      include: {
        clinicalEpisode: true,
        attachment: true,
      },
    });
  }

  async findAll(
    query: QueryClinicalEpisodeAttachmentDto,
  ) {
    const {
      page,
      limit,
      clinicalEpisodeId,
      attachmentId,
      type,
      isPrimary,
    } = query;

    const where: Prisma.ClinicalEpisodeAttachmentWhereInput =
      {
        clinicalEpisodeId,
        attachmentId,
        type,
        isPrimary,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.clinicalEpisodeAttachment.findMany({
          where,

          include: {
            clinicalEpisode: true,
            attachment: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.clinicalEpisodeAttachment.count({
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
    const record =
      await this.prisma.clinicalEpisodeAttachment.findUnique({
        where: {
          id,
        },

        include: {
          clinicalEpisode: true,
          attachment: true,
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Clinical episode attachment not found.',
      );
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateClinicalEpisodeAttachmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.clinicalEpisodeAttachment.update({
      where: {
        id,
      },

      data: dto,

      include: {
        clinicalEpisode: true,
        attachment: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.clinicalEpisodeAttachment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Clinical episode attachment deleted successfully.',
    };
  }
}