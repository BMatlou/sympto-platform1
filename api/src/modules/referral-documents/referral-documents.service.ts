import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferralDocumentDto } from './dto/create-referral-document.dto';
import { UpdateReferralDocumentDto } from './dto/update-referral-document.dto';
import { QueryReferralDocumentDto } from './dto/query-referral-document.dto';

@Injectable()
export class ReferralDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferralDocumentDto,
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

    return this.prisma.referralDocument.create({
      data: {
        referralId: dto.referralId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        referral: true,
      },
    });
  }

  async findAll(
    query: QueryReferralDocumentDto,
  ) {
    const {
      page,
      limit,
      referralId,
      search,
    } = query;

    const where: Prisma.ReferralDocumentWhereInput =
      {
        ...(referralId && {
          referralId,
        }),

        ...(search && {
          OR: [
            {
              fileName: {
                contains: search,
                mode:
                  Prisma.QueryMode.insensitive,
              },
            },
            {
              mimeType: {
                contains: search,
                mode:
                  Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referralDocument.findMany({
          where,

          include: {
            referral: true,
          },

          orderBy: {
            uploadedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referralDocument.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const document =
      await this.prisma.referralDocument.findUnique({
        where: {
          id,
        },

        include: {
          referral: true,
        },
      });

    if (!document) {
      throw new NotFoundException(
        'Referral document not found.',
      );
    }

    return document;
  }

  async update(
    id: string,
    dto: UpdateReferralDocumentDto,
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

    return this.prisma.referralDocument.update({
      where: {
        id,
      },

      data: {
        referralId:
          dto.referralId,
        fileName:
          dto.fileName,
        fileUrl:
          dto.fileUrl,
        mimeType:
          dto.mimeType,
      },

      include: {
        referral: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.referralDocument.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Referral document deleted successfully.',
    };
  }
}