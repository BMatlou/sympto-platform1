import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { QueryAttachmentDto } from './dto/query-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAttachmentDto,
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

    return this.prisma.attachment.create({
      data: {
        encounterId: dto.encounterId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        url: dto.url,
      },

      include: {
        encounter: true,
      },
    });
  }

  async findAll(
    query: QueryAttachmentDto,
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
        this.prisma.attachment.findMany({
          where,

          include: {
            encounter: true,
          },

          orderBy: {
            uploadedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.attachment.count({
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
    const attachment =
      await this.prisma.attachment.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,
        },
      });

    if (!attachment) {
      throw new NotFoundException(
        'Attachment not found.',
      );
    }

    return attachment;
  }

  async update(
    id: string,
    dto: UpdateAttachmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.attachment.update({
      where: {
        id,
      },

      data: {
        encounterId: dto.encounterId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        url: dto.url,
      },

      include: {
        encounter: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.attachment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Attachment deleted successfully.',
    };
  }
}