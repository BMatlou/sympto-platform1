import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, SymptomLogStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { HealthGoalIntelligenceService } from '../health-goals/health-goal-intelligence.service';

import { CreateHealthJournalDto } from './dto/create-health-journal.dto';
import { UpdateHealthJournalDto } from './dto/update-health-journal.dto';
import { QueryHealthJournalDto } from './dto/query-health-journal.dto';
import { SymptomIntelligenceService } from './symptom-intelligence.service';

@Injectable()
export class HealthJournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalIntelligence: HealthGoalIntelligenceService,
    private readonly symptomIntelligence: SymptomIntelligenceService,
  ) {}

  /**
   * Resolve the authenticated user to their patient.
   */
  private async getPatientId(
    userId: string,
  ): Promise<string> {
    const patient = await this.prisma.patient.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    return patient.id;
  }

  async create(
    userId: string,
    dto: CreateHealthJournalDto,
  ) {
    const patientId =
      await this.getPatientId(userId);

    const journal = await this.prisma.healthJournal.create({
      data: {
        ...dto,
        patientId,
      },

      include: {
        patient: true,
        encounter: true,
        practitioner: true,
      },
    });

    await this.healthGoalIntelligence.syncTodayFromJournal(
      patientId,
      journal.createdAt,
    );

    return journal;
  }

  async findAll(
    userId: string,
    query: QueryHealthJournalDto,
  ) {
    const patientId =
      await this.getPatientId(userId);

    const {
      page,
      limit,
      encounterId,
      practitionerId,
      mood,
      energyLevel,
    } = query;

    const where: Prisma.HealthJournalWhereInput = {
      patientId,
      encounterId,
      practitionerId,
      mood,
      energyLevel,
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.healthJournal.findMany({
          where,

          include: {
            patient: true,
            encounter: true,
            practitioner: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.healthJournal.count({
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

  /**
   * Dedicated symptom feed for Smart Journal.
   *
   * Symptoms are clinical records, not HealthJournal rows. Keeping this query
   * here prevents the Smart Journal timeline from depending on the broader
   * Health Home aggregation to discover symptoms.
   */
  /**
   * Search the seeded symptom reference library for the Smart Journal/log flow.
   * Location options are patient-input aids only; they are not diagnoses.
   */
  async findSymptomReference(
    userId: string,
    search?: string,
    limit = 12,
  ) {
    await this.getPatientId(userId);

    const normalized = search?.trim();
    const safeLimit = Math.min(Math.max(limit, 1), 30);
    const rows = await this.prisma.symptom.findMany({
      where: {
        active: true,
        searchable: true,
        ...(normalized
          ? {
              OR: [
                { name: { contains: normalized, mode: 'insensitive' } },
                { description: { contains: normalized, mode: 'insensitive' } },
                { category: { contains: normalized, mode: 'insensitive' } },
                { bodySystem: { contains: normalized, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        bodySystem: true,
        common: true,
      },
      orderBy: [{ common: 'desc' }, { name: 'asc' }],
      take: safeLimit,
    });

    const normalize = (value: unknown) =>
      String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const locationMap: Record<string, string[]> = {
      headache: [
        'Forehead',
        'Temples',
        'Back of head',
        'Behind one eye',
        'Behind both eyes',
        'One side of head',
        'Whole head',
        'Base of skull',
      ],
      migraine: [
        'One side of head',
        'Forehead',
        'Temple',
        'Behind one eye',
        'Both sides of head',
        'Back of head',
      ],
      'chest pain': [
        'Centre of chest',
        'Left side of chest',
        'Right side of chest',
        'Upper chest',
        'Under the breastbone',
        'Whole chest',
      ],
      'abdominal pain': [
        'Upper abdomen',
        'Lower abdomen',
        'Right side of abdomen',
        'Left side of abdomen',
        'Around the belly button',
        'Whole abdomen',
      ],
      'stomach pain': [
        'Upper abdomen',
        'Lower abdomen',
        'Right side of abdomen',
        'Left side of abdomen',
        'Around the belly button',
      ],
      'back pain': [
        'Upper back',
        'Middle back',
        'Lower back',
        'Left side of back',
        'Right side of back',
        'Whole back',
      ],
      'neck pain': [
        'Front of neck',
        'Back of neck',
        'Left side of neck',
        'Right side of neck',
        'Base of skull',
      ],
      'shoulder pain': [
        'Left shoulder',
        'Right shoulder',
        'Both shoulders',
        'Front of shoulder',
        'Back of shoulder',
      ],
      'ear pain': [
        'Left ear',
        'Right ear',
        'Both ears',
        'Behind the ear',
        'Inside the ear',
      ],
      'eye pain': [
        'Left eye',
        'Right eye',
        'Both eyes',
        'Behind the eye',
        'Around the eye',
      ],
      'tooth pain': [
        'Upper teeth',
        'Lower teeth',
        'Front teeth',
        'Back teeth',
        'Left side',
        'Right side',
      ],
      'joint pain': [
        'Left side',
        'Right side',
        'Both sides',
        'Front of the joint',
        'Back of the joint',
      ],
    };

    const suggestionsFor = (name: string) => {
      const key = normalize(name);
      if (locationMap[key]) return locationMap[key];
      const relatedKey = Object.keys(locationMap).find((candidate) => key.includes(candidate) || candidate.includes(key));
      return relatedKey ? locationMap[relatedKey] : [];
    };

    return {
      data: rows.map((row) => ({
        ...row,
        suggestedLocations: suggestionsFor(row.name),
      })),
      total: rows.length,
    };
  }

  async findSymptoms(
    userId: string,
    limit = 100,
  ) {
    const patientId = await this.getPatientId(userId);

    const data = await this.prisma.symptomLog.findMany({
      where: {
        clinicalEpisode: { patientId },
        status: {
          notIn: [
            SymptomLogStatus.DRAFT,
            SymptomLogStatus.CANCELLED,
          ],
        },
      },
      include: {
        clinicalEpisode: true,
        symptoms: {
          include: {
            symptom: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        triggers: true,
        monitorings: {
          orderBy: {
            observedAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return {
      data,
      total: data.length,
    };
  }

  async findOne(
    userId: string,
    id: string,
  ) {
    const patientId =
      await this.getPatientId(userId);

    const journal =
      await this.prisma.healthJournal.findFirst({
        where: {
          id,
          patientId,
        },

        include: {
          patient: true,
          encounter: true,
          practitioner: true,
        },
      });

    if (!journal) {
      throw new NotFoundException(
        'Health journal not found.',
      );
    }

    return journal;
  }

  async findSymptomOne(
    userId: string,
    id: string,
  ) {
    const patientId = await this.getPatientId(userId);
    const symptom = await this.prisma.symptomLog.findFirst({
      where: {
        id,
        clinicalEpisode: { patientId },
      },
      include: {
        clinicalEpisode: {
          include: {
            practitioner: true,
            appointment: true,
            encounter: true,
          },
        },
        symptoms: {
          include: {
            symptom: true,
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
        observations: {
          include: {
            aiAnalysis: true,
          },
        },
        monitorings: {
          orderBy: { observedAt: 'asc' },
        },
        attachments: {
          include: {
            attachment: true,
          },
        },
      },
    });

    if (!symptom) {
      throw new NotFoundException('Symptom log not found.');
    }

    const intelligence = await this.symptomIntelligence.analyzeSymptomTimeline(
      patientId,
      symptom,
    );

    return {
      ...symptom,
      intelligence,
    };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateHealthJournalDto,
  ) {
    const patientId =
      await this.getPatientId(userId);

    const journal =
      await this.prisma.healthJournal.findFirst({
        where: {
          id,
          patientId,
        },
      });

    if (!journal) {
      throw new NotFoundException(
        'Health journal not found.',
      );
    }

    const updatedJournal = await this.prisma.healthJournal.update({
      where: {
        id,
      },

      data: dto,

      include: {
        patient: true,
        encounter: true,
        practitioner: true,
      },
    });

    await this.healthGoalIntelligence.syncTodayFromJournal(
      patientId,
      updatedJournal.createdAt,
    );

    return updatedJournal;
  }

  async remove(
    userId: string,
    id: string,
  ) {
    const patientId =
      await this.getPatientId(userId);

    const journal =
      await this.prisma.healthJournal.findFirst({
        where: {
          id,
          patientId,
        },
      });

    if (!journal) {
      throw new NotFoundException(
        'Health journal not found.',
      );
    }

    await this.prisma.healthJournal.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Health journal deleted successfully.',
    };
  }
}