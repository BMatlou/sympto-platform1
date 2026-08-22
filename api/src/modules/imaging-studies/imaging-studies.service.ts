import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingStudyDto } from './dto/create-imaging-study.dto';
import { UpdateImagingStudyDto } from './dto/update-imaging-study.dto';
import { QueryImagingStudyDto } from './dto/query-imaging-study.dto';

@Injectable()
export class ImagingStudiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingStudyDto,
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

    const order =
      await this.prisma.imagingOrder.findUnique({
        where: {
          id: dto.orderId,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Imaging order not found.',
      );
    }

    if (dto.deviceId) {
      const device =
        await this.prisma.imagingDevice.findUnique({
          where: {
            id: dto.deviceId,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Imaging device not found.',
        );
      }
    }

    if (dto.imagingCenterId) {
      const center =
        await this.prisma.imagingCenter.findUnique({
          where: {
            id: dto.imagingCenterId,
          },
        });

      if (!center) {
        throw new NotFoundException(
          'Imaging center not found.',
        );
      }
    }

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    if (dto.encounterId) {
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
    }

    return this.prisma.imagingStudy.create({
      data: {
        orderId: dto.orderId,
        patientId: dto.patientId,
        deviceId: dto.deviceId,
        imagingCenterId:
          dto.imagingCenterId,
        accessionNumber:
          dto.accessionNumber,
        studyInstanceUID:
          dto.studyInstanceUID,
        status: dto.status,
        performedAt: dto.performedAt,
        reportedAt: dto.reportedAt,
        practitionerId:
          dto.practitionerId,
        encounterId:
          dto.encounterId,
      },

      include: {
        patient: true,
        order: true,
        practitioner: true,
        encounter: true,
        imagingCenter: true,
        device: true,
        reports: true,
        series: true,
      },
    });
  }

  async findAll(
    query: QueryImagingStudyDto,
  ) {
    const {
      page,
      limit,
      patientId,
      orderId,
      imagingCenterId,
      search,
    } = query;

    const where: Prisma.ImagingStudyWhereInput =
      {
        ...(patientId && {
          patientId,
        }),

        ...(orderId && {
          orderId,
        }),

        ...(imagingCenterId && {
          imagingCenterId,
        }),

        ...(search && {
          OR: [
            {
              accessionNumber: {
                contains: search,
              },
            },
            {
              studyInstanceUID: {
                contains: search,
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingStudy.findMany({
          where,

          include: {
            patient: true,
            order: true,
            practitioner: true,
            encounter: true,
            imagingCenter: true,
            device: true,
            reports: true,
            series: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingStudy.count({
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
    const study =
      await this.prisma.imagingStudy.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          order: true,
          practitioner: true,
          encounter: true,
          imagingCenter: true,
          device: true,
          reports: true,
          series: {
            include: {
              images: true,
            },
          },
        },
      });

    if (!study) {
      throw new NotFoundException(
        'Imaging study not found.',
      );
    }

    return study;
  }

  async update(
    id: string,
    dto: UpdateImagingStudyDto,
  ) {
    await this.findOne(id);

    return this.prisma.imagingStudy.update({
      where: {
        id,
      },

      data: {
        orderId: dto.orderId,
        patientId: dto.patientId,
        deviceId: dto.deviceId,
        imagingCenterId:
          dto.imagingCenterId,
        accessionNumber:
          dto.accessionNumber,
        studyInstanceUID:
          dto.studyInstanceUID,
        status: dto.status,
        performedAt: dto.performedAt,
        reportedAt: dto.reportedAt,
        practitionerId:
          dto.practitionerId,
        encounterId:
          dto.encounterId,
      },

      include: {
        patient: true,
        order: true,
        practitioner: true,
        encounter: true,
        imagingCenter: true,
        device: true,
        reports: true,
        series: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingStudy.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging study deleted successfully.',
    };
  }
}