import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateResultVerificationDto } from './dto/create-result-verification.dto';
import { UpdateResultVerificationDto } from './dto/update-result-verification.dto';
import { QueryResultVerificationDto } from './dto/query-result-verification.dto';

@Injectable()
export class ResultVerificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateResultVerificationDto,
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

    return this.prisma.resultVerification.create({
      data: {
        resultId: dto.resultId,
        practitionerId: dto.practitionerId,
        action: dto.action,
        comments: dto.comments,
        verifiedAt: dto.verifiedAt
          ? new Date(dto.verifiedAt)
          : undefined,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryResultVerificationDto,
  ) {
    const {
      page,
      limit,
      resultId,
      practitionerId,
    } = query;

    const where = {
      ...(resultId && { resultId }),
      ...(practitionerId && {
        practitionerId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.resultVerification.findMany({
          where,

          include: {
            result: true,
            practitioner: true,
          },

          orderBy: {
            verifiedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.resultVerification.count({
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
    const verification =
      await this.prisma.resultVerification.findUnique({
        where: {
          id,
        },

        include: {
          result: true,
          practitioner: true,
        },
      });

    if (!verification) {
      throw new NotFoundException(
        'Result verification not found.',
      );
    }

    return verification;
  }

  async update(
    id: string,
    dto: UpdateResultVerificationDto,
  ) {
    await this.findOne(id);

    return this.prisma.resultVerification.update({
      where: {
        id,
      },

      data: {
        resultId: dto.resultId,
        practitionerId:
          dto.practitionerId,
        action: dto.action,
        comments: dto.comments,
        verifiedAt: dto.verifiedAt
          ? new Date(dto.verifiedAt)
          : undefined,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.resultVerification.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Result verification deleted successfully.',
    };
  }
}