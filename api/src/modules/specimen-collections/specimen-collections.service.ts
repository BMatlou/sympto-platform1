import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecimenCollectionDto } from './dto/create-specimen-collection.dto';
import { UpdateSpecimenCollectionDto } from './dto/update-specimen-collection.dto';
import { QuerySpecimenCollectionDto } from './dto/query-specimen-collection.dto';

@Injectable()
export class SpecimenCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecimenCollectionDto,
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

    return this.prisma.specimenCollection.create({
      data: {
        specimenId: dto.specimenId,
        practitionerId: dto.practitionerId,
        collectedAt: new Date(
          dto.collectedAt,
        ),
        notes: dto.notes,
      },

      include: {
        specimen: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QuerySpecimenCollectionDto,
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
        this.prisma.specimenCollection.findMany({
          where,

          include: {
            specimen: true,
            practitioner: true,
          },

          orderBy: {
            collectedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.specimenCollection.count({
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
    const collection =
      await this.prisma.specimenCollection.findUnique({
        where: {
          id,
        },

        include: {
          specimen: true,
          practitioner: true,
        },
      });

    if (!collection) {
      throw new NotFoundException(
        'Specimen collection not found.',
      );
    }

    return collection;
  }

  async update(
    id: string,
    dto: UpdateSpecimenCollectionDto,
  ) {
    await this.findOne(id);

    return this.prisma.specimenCollection.update({
      where: {
        id,
      },

      data: {
        specimenId: dto.specimenId,
        practitionerId: dto.practitionerId,
        collectedAt: dto.collectedAt
          ? new Date(dto.collectedAt)
          : undefined,
        notes: dto.notes,
      },

      include: {
        specimen: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.specimenCollection.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specimen collection deleted successfully.',
    };
  }
}