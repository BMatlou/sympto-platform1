import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLaboratoryInstrumentDto } from './dto/create-laboratory-instrument.dto';
import { UpdateLaboratoryInstrumentDto } from './dto/update-laboratory-instrument.dto';
import { QueryLaboratoryInstrumentDto } from './dto/query-laboratory-instrument.dto';

@Injectable()
export class LaboratoryInstrumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLaboratoryInstrumentDto,
  ) {
    const laboratory =
      await this.prisma.laboratory.findUnique({
        where: {
          id: dto.laboratoryId,
        },
      });

    if (!laboratory) {
      throw new NotFoundException(
        'Laboratory not found.',
      );
    }

    return this.prisma.laboratoryInstrument.create({
      data: {
        laboratoryId: dto.laboratoryId,
        code: dto.code,
        name: dto.name,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        active: dto.active,
        installedAt: dto.installedAt
          ? new Date(dto.installedAt)
          : undefined,
      },

      include: {
        laboratory: true,
        calibrations: true,
        qualityControls: true,
      },
    });
  }

  async findAll(
    query: QueryLaboratoryInstrumentDto,
  ) {
    const {
      page,
      limit,
      laboratoryId,
      search,
      active,
    } = query;

    const where: Prisma.LaboratoryInstrumentWhereInput = {
      ...(laboratoryId && {
        laboratoryId,
      }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
            },
          },
          {
            name: {
              contains: search,
            },
          },
          {
            manufacturer: {
              contains: search,
            },
          },
          {
            model: {
              contains: search,
            },
          },
          {
            serialNumber: {
              contains: search,
            },
          },
        ],
      }),

      ...(active !== undefined && {
        active,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.laboratoryInstrument.findMany({
          where,

          include: {
            laboratory: true,
            calibrations: true,
            qualityControls: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.laboratoryInstrument.count({
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
    const instrument =
      await this.prisma.laboratoryInstrument.findUnique({
        where: {
          id,
        },

        include: {
          laboratory: true,
          calibrations: true,
          qualityControls: true,
        },
      });

    if (!instrument) {
      throw new NotFoundException(
        'Laboratory instrument not found.',
      );
    }

    return instrument;
  }

  async update(
    id: string,
    dto: UpdateLaboratoryInstrumentDto,
  ) {
    await this.findOne(id);

    if (dto.laboratoryId) {
      const laboratory =
        await this.prisma.laboratory.findUnique({
          where: {
            id: dto.laboratoryId,
          },
        });

      if (!laboratory) {
        throw new NotFoundException(
          'Laboratory not found.',
        );
      }
    }

    return this.prisma.laboratoryInstrument.update({
      where: {
        id,
      },

      data: {
        laboratoryId: dto.laboratoryId,
        code: dto.code,
        name: dto.name,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        active: dto.active,
        installedAt: dto.installedAt
          ? new Date(dto.installedAt)
          : undefined,
      },

      include: {
        laboratory: true,
        calibrations: true,
        qualityControls: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.laboratoryInstrument.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Laboratory instrument deleted successfully.',
    };
  }
}