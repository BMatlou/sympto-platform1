import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSymptomLogAttachmentDto } from './dto/create-symptom-log-attachment.dto';
import { UpdateSymptomLogAttachmentDto } from './dto/update-symptom-log-attachment.dto';
import { QuerySymptomLogAttachmentDto } from './dto/query-symptom-log-attachment.dto';

@Injectable()
export class SymptomLogAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSymptomLogAttachmentDto,
  ) {
    return this.prisma.symptomLogAttachment.create({
      data: dto,

      include: {
        symptomLog: true,
        attachment: true,
      },
    });
  }

  async findAll(
    query: QuerySymptomLogAttachmentDto,
  ) {
    const {
      page,
      limit,
      symptomLogId,
      attachmentId,
      type,
      category,
      isPrimary,
    } = query;

    const where: Prisma.SymptomLogAttachmentWhereInput =
      {
        symptomLogId,
        attachmentId,
        type,
        category,
        isPrimary,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.symptomLogAttachment.findMany({
          where,

          include: {
            symptomLog: true,
            attachment: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.symptomLogAttachment.count({
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
      await this.prisma.symptomLogAttachment.findUnique({
        where: {
          id,
        },

        include: {
          symptomLog: true,
          attachment: true,
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Symptom log attachment not found.',
      );
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateSymptomLogAttachmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.symptomLogAttachment.update({
      where: {
        id,
      },

      data: dto,

      include: {
        symptomLog: true,
        attachment: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.symptomLogAttachment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Symptom log attachment deleted successfully.',
    };
  }
}