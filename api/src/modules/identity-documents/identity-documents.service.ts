import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdentityDocumentType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateIdentityDocumentDto } from './dto/create-identity-document.dto';
import { UpdateIdentityDocumentDto } from './dto/update-identity-document.dto';
import { QueryIdentityDocumentDto } from './dto/query-identity-document.dto';

@Injectable()
export class IdentityDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateIdentityDocumentDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    if (dto.issuingCountryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.issuingCountryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Issuing country not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.identityDocument.findFirst({
        where: {
          documentNumber: dto.documentNumber,
          type: dto.type,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'An identity document with this type and document number already exists.',
      );
    }

    return this.prisma.identityDocument.create({
      data: {
        patientId: dto.patientId,
        type: dto.type,
        documentNumber: dto.documentNumber,
        issuingCountryId: dto.issuingCountryId,
        expiryDate: dto.expiryDate,
        verified: dto.verified ?? false,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
        issuingCountry: true,
      },
    });
  }

  async findAll(
    query: QueryIdentityDocumentDto,
  ) {
    const {
      page,
      limit,
      patientId,
      issuingCountryId,
      type,
      verified,
    } = query;

    const where: Prisma.IdentityDocumentWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(issuingCountryId && {
        issuingCountryId,
      }),

      ...(type && {
        type,
      }),

      ...(verified !== undefined && {
        verified,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.identityDocument.findMany({
          where,

          include: {
            patient: {
              include: {
                person: true,
              },
            },
            issuingCountry: true,
          },

          orderBy: [
            {
              createdAt: 'desc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.identityDocument.count({
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
    const document =
      await this.prisma.identityDocument.findUnique({
        where: {
          id,
        },

        include: {
          patient: {
            include: {
              person: true,
            },
          },
          issuingCountry: true,
        },
      });

    if (!document) {
      throw new NotFoundException(
        'Identity document not found.',
      );
    }

    return document;
  }

  async update(
    id: string,
    dto: UpdateIdentityDocumentDto,
  ) {
    await this.findOne(id);

    if (dto.patientId) {
      const patient =
        await this.prisma.patient.findUnique({
          where: {
            id: dto.patientId,
          },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    if (dto.issuingCountryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.issuingCountryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Issuing country not found.',
        );
      }
    }

    if (
      dto.documentNumber ||
      dto.type
    ) {
      const current =
        await this.prisma.identityDocument.findUnique({
          where: {
            id,
          },
        });

      const duplicate =
        await this.prisma.identityDocument.findFirst({
          where: {
            id: {
              not: id,
            },
            documentNumber:
              dto.documentNumber ??
              current?.documentNumber,
            type:
              dto.type ??
              current?.type,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'An identity document with this type and document number already exists.',
        );
      }
    }

    return this.prisma.identityDocument.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        type: dto.type,
        documentNumber: dto.documentNumber,
        issuingCountryId: dto.issuingCountryId,
        expiryDate: dto.expiryDate,
        verified: dto.verified,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
        issuingCountry: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.identityDocument.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Identity document deleted successfully.',
    };
  }
}