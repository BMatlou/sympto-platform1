import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecimenRejectionDto } from './dto/create-specimen-rejection.dto';
import { UpdateSpecimenRejectionDto } from './dto/update-specimen-rejection.dto';
import { QuerySpecimenRejectionDto } from './dto/query-specimen-rejection.dto';

@Injectable()
export class SpecimenRejectionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecimenRejectionDto,
  ) {
    const specimen =
      await this.prisma.specimen.findUnique({
        where: {
          id: dto.specimenId,
        },
      });

    if (!specimen) {
      throw new NotFoundException(
        'Specimen not found.',
      );
    }

    return this.prisma.specimenRejection.create({
      data: {
        specimenId: dto.specimenId,
        reason: dto.reason,
        rejectedAt: dto.rejectedAt
          ? new Date(dto.rejectedAt)
          : undefined,
      },

      include: {
        specimen: true,
      },
    });
  }

  async findAll(
    query: QuerySpecimenRejectionDto,
  ) {
    const {
      page,
      limit,
      specimenId,
    } = query;

    const where = specimenId
      ? {
          specimenId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.specimenRejection.findMany({
          where,

          include: {
            specimen: true,
          },

          orderBy: {
            rejectedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.specimenRejection.count({
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
    const rejection =
      await this.prisma.specimenRejection.findUnique({
        where: {
          id,
        },

        include: {
          specimen: true,
        },
      });

    if (!rejection) {
      throw new NotFoundException(
        'Specimen rejection not found.',
      );
    }

    return rejection;
  }

  async update(
    id: string,
    dto: UpdateSpecimenRejectionDto,
  ) {
    await this.findOne(id);

    return this.prisma.specimenRejection.update({
      where: {
        id,
      },

      data: {
        specimenId: dto.specimenId,
        reason: dto.reason,
        rejectedAt: dto.rejectedAt
          ? new Date(dto.rejectedAt)
          : undefined,
      },

      include: {
        specimen: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.specimenRejection.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specimen rejection deleted successfully.',
    };
  }
}