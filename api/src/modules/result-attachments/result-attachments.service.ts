import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateResultAttachmentDto } from './dto/create-result-attachment.dto';
import { UpdateResultAttachmentDto } from './dto/update-result-attachment.dto';
import { QueryResultAttachmentDto } from './dto/query-result-attachment.dto';

@Injectable()
export class ResultAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateResultAttachmentDto,
  ) {
    const result =
      await this.prisma.labResult.findUnique({
        where: {
          id: dto.resultId,
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Lab result not found.',
      );
    }

    return this.prisma.resultAttachment.create({
      data: {
        resultId: dto.resultId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        result: true,
      },
    });
  }

  async findAll(
    query: QueryResultAttachmentDto,
  ) {
    const {
      page,
      limit,
      resultId,
    } = query;

    const where = resultId
      ? {
          resultId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.resultAttachment.findMany({
          where,

          include: {
            result: true,
          },

          orderBy: {
            uploadedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.resultAttachment.count({
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
      await this.prisma.resultAttachment.findUnique({
        where: {
          id,
        },

        include: {
          result: true,
        },
      });

    if (!attachment) {
      throw new NotFoundException(
        'Result attachment not found.',
      );
    }

    return attachment;
  }

  async update(
    id: string,
    dto: UpdateResultAttachmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.resultAttachment.update({
      where: {
        id,
      },

      data: {
        resultId: dto.resultId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        result: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.resultAttachment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Result attachment deleted successfully.',
    };
  }
}