import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePublicHealthAttachmentDto } from './dto/create-public-health-attachment.dto';
import { UpdatePublicHealthAttachmentDto } from './dto/update-public-health-attachment.dto';
import { QueryPublicHealthAttachmentDto } from './dto/query-public-health-attachment.dto';

@Injectable()
export class PublicHealthAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePublicHealthAttachmentDto,
  ) {
    const report =
      await this.prisma.publicHealthReport.findUnique({
        where: {
          id: dto.reportId,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Public health report not found.',
      );
    }

    return this.prisma.publicHealthAttachment.create({
      data: {
        reportId: dto.reportId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        report: true,
      },
    });
  }

  async findAll(
    query: QueryPublicHealthAttachmentDto,
  ) {
    const {
      page,
      limit,
      reportId,
    } = query;

    const where: Prisma.PublicHealthAttachmentWhereInput = {
      ...(reportId && {
        reportId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.publicHealthAttachment.findMany({
          where,

          include: {
            report: true,
          },

          orderBy: {
            uploadedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.publicHealthAttachment.count({
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
      await this.prisma.publicHealthAttachment.findUnique({
        where: {
          id,
        },

        include: {
          report: true,
        },
      });

    if (!attachment) {
      throw new NotFoundException(
        'Public health attachment not found.',
      );
    }

    return attachment;
  }

  async update(
    id: string,
    dto: UpdatePublicHealthAttachmentDto,
  ) {
    await this.findOne(id);

    if (dto.reportId) {
      const report =
        await this.prisma.publicHealthReport.findUnique({
          where: {
            id: dto.reportId,
          },
        });

      if (!report) {
        throw new NotFoundException(
          'Public health report not found.',
        );
      }
    }

    return this.prisma.publicHealthAttachment.update({
      where: {
        id,
      },

      data: {
        reportId: dto.reportId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        report: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.publicHealthAttachment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Public health attachment deleted successfully.',
    };
  }
}