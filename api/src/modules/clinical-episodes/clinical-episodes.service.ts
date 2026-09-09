import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClinicalEpisodeDto } from './dto/create-clinical-episode.dto';
import { UpdateClinicalEpisodeDto } from './dto/update-clinical-episode.dto';
import { QueryClinicalEpisodeDto } from './dto/query-clinical-episode.dto';

@Injectable()
export class ClinicalEpisodesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnPatientId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new ForbiddenException('Authenticated user is not a patient.');
    }

    return patient.id;
  }

  private async assertOwnEpisode(id: string, userId: string) {
    const patientId = await this.getOwnPatientId(userId);
    const episode = await this.prisma.clinicalEpisode.findFirst({
      where: { id, patientId },
    });

    if (!episode) {
      throw new NotFoundException('Clinical episode not found.');
    }

    return { patientId, episode };
  }

  async create(dto: CreateClinicalEpisodeDto, userId: string) {
    const patientId = await this.getOwnPatientId(userId);
    if (dto.patientId !== patientId) {
      throw new ForbiddenException('You can only create episodes for your own health record.');
    }

    return this.prisma.clinicalEpisode.create({
      data: {
        ...dto,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
      },
    });
  }

  async findAll(query: QueryClinicalEpisodeDto, userId: string) {
    const ownPatientId = await this.getOwnPatientId(userId);
    const {
      page,
      limit,
      search,
      patientId,
      encounterId,
      appointmentId,
      practitionerId,
      type,
      status,
      priority,
    } = query;

    if (patientId && patientId !== ownPatientId) {
      throw new ForbiddenException('You can only view your own clinical episodes.');
    }

    const where: Prisma.ClinicalEpisodeWhereInput = {
      patientId: ownPatientId,
      encounterId,
      appointmentId,
      practitionerId,
      type,
      status,
      priority,
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.clinicalEpisode.findMany({
        where,
        include: {
          patient: true,
          practitioner: true,
          encounter: true,
          appointment: true,
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clinicalEpisode.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    await this.assertOwnEpisode(id, userId);

    const episode = await this.prisma.clinicalEpisode.findUnique({
      where: { id },
      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        appointment: true,
        symptomLogs: true,
        diagnoses: true,
        clinicalNotes: true,
        prescriptions: true,
        labOrders: true,
        imagingStudies: true,
        carePlans: true,
        referrals: true,
      },
    });

    if (!episode) throw new NotFoundException('Clinical episode not found.');
    return episode;
  }

  async update(id: string, dto: UpdateClinicalEpisodeDto, userId: string) {
    await this.assertOwnEpisode(id, userId);

    return this.prisma.clinicalEpisode.update({
      where: { id },
      data: {
        ...dto,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwnEpisode(id, userId);
    await this.prisma.clinicalEpisode.delete({ where: { id } });
    return { message: 'Clinical episode deleted successfully.' };
  }
}
