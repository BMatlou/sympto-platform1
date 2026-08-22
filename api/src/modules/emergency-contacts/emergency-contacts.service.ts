import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { QueryEmergencyContactDto } from './dto/query-emergency-contact.dto';

@Injectable()
export class EmergencyContactsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateEmergencyContactDto,
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

    // Only one primary emergency contact per patient
    if (dto.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: {
          patientId: dto.patientId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.emergencyContact.create({
      data: {
        patientId: dto.patientId,
        fullName: dto.fullName,
        relationship: dto.relationship,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        isPrimary: dto.isPrimary ?? false,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryEmergencyContactDto,
  ) {
    const {
      page,
      limit,
      patientId,
      isPrimary,
    } = query;

    const where: Prisma.EmergencyContactWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(isPrimary !== undefined && {
        isPrimary,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.emergencyContact.findMany({
          where,

          include: {
            patient: {
              include: {
                person: true,
              },
            },
          },

          orderBy: [
            {
              isPrimary: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.emergencyContact.count({
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
    const contact =
      await this.prisma.emergencyContact.findUnique({
        where: {
          id,
        },

        include: {
          patient: {
            include: {
              person: true,
            },
          },
        },
      });

    if (!contact) {
      throw new NotFoundException(
        'Emergency contact not found.',
      );
    }

    return contact;
  }

  async update(
    id: string,
    dto: UpdateEmergencyContactDto,
  ) {
    const existing =
      await this.findOne(id);

    const patientId =
      dto.patientId ??
      existing.patientId;

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

    if (dto.isPrimary === true) {
      await this.prisma.emergencyContact.updateMany({
        where: {
          patientId,
          isPrimary: true,
          NOT: {
            id,
          },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.emergencyContact.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        fullName: dto.fullName,
        relationship: dto.relationship,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        isPrimary: dto.isPrimary,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.emergencyContact.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Emergency contact deleted successfully.',
    };
  }
}