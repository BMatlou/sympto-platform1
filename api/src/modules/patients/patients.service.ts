import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePatientDto) {

  const existing = await this.prisma.patient.findFirst({
    where: {
      OR: [
        { personId: dto.personId },
        { userId: dto.userId },
        ...(dto.patientNumber
          ? [{ patientNumber: dto.patientNumber }]
          : []),
      ],
    },
  });

  if (existing) {
    throw new BadRequestException(
      'Patient already exists.',
    );
  }

  return this.prisma.patient.create({
    data: {
      userId: dto.userId,
      personId: dto.personId,
      patientNumber: dto.patientNumber,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      dateOfDeath: dto.dateOfDeath
        ? new Date(dto.dateOfDeath)
        : undefined,
    },
    include: {
      person: true,
      user: true,
    },
  });
}

  async findAll(query: QueryPatientDto) {
    const {
      page,
      limit,
      search,
    } = query;

    const where = search
      ? {
          OR: [
            {
              patientNumber: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
            {
              person: {
                firstName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              person: {
                lastName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
          ],
        }
      : {};

    const [patients, total] =
      await this.prisma.$transaction([
        this.prisma.patient.findMany({
          where,

          include: {
            person: true,
            user: true,
          },

          skip: (page - 1) * limit,

          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.patient.count({
          where,
        }),
      ]);

    return {
      data: patients,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id,
      },
      include: {
        person: true,
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    return patient;
  }

  /**
   * Enterprise Patient Profile
   *
   * This endpoint becomes the single source of truth
   * for the mobile application, practitioner portal,
   * AI engine and wearable integrations.
   */
  async getProfile(id: string) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id,
        },

        include: {
          person: true,

          user: {
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          medicalRecord: true,

          healthPassport: true,

          appointments: true,

          wearableDevices: true,

          aianalyses: true,

          emergencyContacts: true,

          identityDocuments: true,

          patientInsurances: true,

          insurancePolicies: true,

          carePlans: true,

          referrals: true,

          labOrders: true,

          imagingStudies: true,

          telemedicineConsents: true,

          publicHealthReports: true,

          dataAccessConsents: true,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    return {
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        deceased: patient.deceased,

        person: patient.person,

        user: patient.user,

        emergencyContacts:
          patient.emergencyContacts,

        identityDocuments:
          patient.identityDocuments,
      },

      medicalRecord:
        patient.medicalRecord,

      healthPassport:
        patient.healthPassport,

      appointments:
        patient.appointments,

      wearableDevices:
        patient.wearableDevices,

      aiAnalyses:
        patient.aianalyses,

      insurance: {
        patientInsurances:
          patient.patientInsurances,

        insurancePolicies:
          patient.insurancePolicies,
      },

      carePlans:
        patient.carePlans,

      referrals:
        patient.referrals,

      labOrders:
        patient.labOrders,

      imagingStudies:
        patient.imagingStudies,

      telemedicine:
        patient.telemedicineConsents,

      publicHealthReports:
        patient.publicHealthReports,

      dataAccessConsents:
        patient.dataAccessConsents,

      familyMembers: [],

      aiSummary: null,
    };
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
  ) {
    await this.findOne(id);

    return this.prisma.patient.update({
      where: {
        id,
      },
      data: {
        patientNumber: dto.patientNumber,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        dateOfDeath: dto.dateOfDeath
          ? new Date(dto.dateOfDeath)
          : undefined,
      },
      include: {
        person: true,
        user: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.patient.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient deleted successfully.',
    };
  }
}