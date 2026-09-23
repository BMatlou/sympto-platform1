import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSymptomLogDto } from './dto/create-symptom-log.dto';
import { UpdateSymptomLogDto } from './dto/update-symptom-log.dto';
import { QuerySymptomLogDto } from './dto/query-symptom-log.dto';

@Injectable()
export class SymptomLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async actorScope(userId: string): Promise<Prisma.SymptomLogWhereInput> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        userType: true,
        patient: { select: { id: true } },
        practitioner: { select: { id: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found.');

    if (user.userType === UserType.ADMIN) return {};

    if (user.userType === UserType.PATIENT) {
      if (!user.patient) throw new NotFoundException('Patient profile not found.');
      return { clinicalEpisode: { patientId: user.patient.id } };
    }

    if (!user.practitioner) {
      throw new NotFoundException('Practitioner profile not found.');
    }

    return { clinicalEpisode: { practitionerId: user.practitioner.id } };
  }

  private async assertEpisodeAccess(
    userId: string,
    clinicalEpisodeId: string,
  ) {
    const scope = await this.actorScope(userId);

    if (Object.keys(scope).length === 0) {
      const episode = await this.prisma.clinicalEpisode.findUnique({
        where: { id: clinicalEpisodeId },
        select: { id: true },
      });
      if (!episode) throw new NotFoundException('Clinical episode not found.');
      return;
    }

    const relation = scope.clinicalEpisode as { patientId?: string; practitionerId?: string };
    const episode = await this.prisma.clinicalEpisode.findFirst({
      where: {
        id: clinicalEpisodeId,
        ...(relation.patientId ? { patientId: relation.patientId } : {}),
        ...(relation.practitionerId ? { practitionerId: relation.practitionerId } : {}),
      },
      select: { id: true },
    });

    if (!episode) {
      throw new NotFoundException('Clinical episode not found.');
    }
  }

  async create(userId: string, dto: CreateSymptomLogDto) {
    await this.assertEpisodeAccess(userId, dto.clinicalEpisodeId);

    return this.prisma.symptomLog.create({
      data: {
        ...dto,
        startedAt: new Date(dto.startedAt),
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },
    });
  }

  async findAll(userId: string, query: QuerySymptomLogDto) {
    const {
      page,
      limit,
      search,
      clinicalEpisodeId,
      status,
      overallSeverity,
      progression,
    } = query;

    const scope = await this.actorScope(userId);
    const relation = scope.clinicalEpisode as
      | { patientId?: string; practitionerId?: string }
      | undefined;

    const where: Prisma.SymptomLogWhereInput = {
      ...scope,
      ...(clinicalEpisodeId
        ? {
            clinicalEpisode: {
              ...(relation?.patientId ? { patientId: relation.patientId } : {}),
              ...(relation?.practitionerId ? { practitionerId: relation.practitionerId } : {}),
              id: clinicalEpisodeId,
            },
          }
        : {}),
      status,
      overallSeverity,
      progression,
      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            notes: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.symptomLog.findMany({
        where,
        include: {
          clinicalEpisode: true,
          symptoms: true,
          triggers: true,
          medicationEffects: true,
          observations: true,
          attachments: true,
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.symptomLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const scope = await this.actorScope(userId);
    const log = await this.prisma.symptomLog.findFirst({
      where: {
        id,
        ...scope,
      },
      include: {
        clinicalEpisode: true,
        symptoms: {
          include: {
            aisymptom: true,
          },
        },
        triggers: true,
        medicationEffects: {
          include: {
            medication: true,
            prescription: true,
          },
        },
        observations: true,
        attachments: {
          include: {
            attachment: true,
          },
        },
      },
    });

    if (!log) throw new NotFoundException('Symptom log not found.');
    return log;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSymptomLogDto,
  ) {
    const current = await this.findOne(userId, id);

    if (dto.clinicalEpisodeId) {
      await this.assertEpisodeAccess(userId, dto.clinicalEpisodeId);
    }

    return this.prisma.symptomLog.update({
      where: { id: current.id },
      data: {
        ...dto,
        startedAt: dto.startedAt
          ? new Date(dto.startedAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.findOne(userId, id);
    await this.prisma.symptomLog.delete({ where: { id: current.id } });
    return { message: 'Symptom log deleted successfully.' };
  }
}