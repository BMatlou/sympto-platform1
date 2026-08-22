import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClaimDocumentDto } from './dto/create-claim-document.dto';
import { QueryClaimDocumentDto } from './dto/query-claim-document.dto';
import { UpdateClaimDocumentDto } from './dto/update-claim-document.dto';

@Injectable()
export class ClaimDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClaimDocumentDto,
  ) {
    const claim =
      await this.prisma.claim.findUnique({
        where: {
          id: dto.claimId,
        },
      });

    if (!claim) {
      throw new NotFoundException(
        'Claim not found.',
      );
    }

    return this.prisma.claimDocument.create({
      data: {
        claimId: dto.claimId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
      },

      include: {
        claim: true,
      },
    });
  }

    async findAll(
    query: QueryClaimDocumentDto,
  ) {
    const {
      page,
      limit,
      claimId,
    } = query;

    const where: Prisma.ClaimDocumentWhereInput = {
      ...(claimId && {
        claimId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.claimDocument.findMany({
          where,

          include: {
            claim: true,
          },

          orderBy: {
            uploadedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.claimDocument.count({
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
      await this.prisma.claimDocument.findUnique({
        where: {
          id,
        },

        include: {
          claim: true,
        },
      });

    if (!document) {
      throw new NotFoundException(
        'Claim document not found.',
      );
    }

    return document;
  }

    async update(
    id: string,
    dto: UpdateClaimDocumentDto,
  ) {
    const existing =
      await this.prisma.claimDocument.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim document not found.',
      );
    }

    if (dto.claimId) {
      const claim =
        await this.prisma.claim.findUnique({
          where: {
            id: dto.claimId,
          },
        });

      if (!claim) {
        throw new NotFoundException(
          'Claim not found.',
        );
      }
    }

    return this.prisma.claimDocument.update({
      where: {
        id,
      },

      data: {
        claimId:
          dto.claimId,
        fileName:
          dto.fileName,
        fileUrl:
          dto.fileUrl,
        mimeType:
          dto.mimeType,
      },

      include: {
        claim: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const existing =
      await this.prisma.claimDocument.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim document not found.',
      );
    }

    await this.prisma.claimDocument.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Claim document deleted successfully.',
    };
  }
}