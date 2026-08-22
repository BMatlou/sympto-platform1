import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateMedicalRecordDto) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id: dto.patientId,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    return this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        chronicConditions: dto.chronicConditions,
        pastMedicalHistory: dto.pastMedicalHistory,
        surgicalHistory: dto.surgicalHistory,
        familyHistory: dto.familyHistory,
        socialHistory: dto.socialHistory,
        currentMedications: dto.currentMedications,
        immunizationNotes: dto.immunizationNotes,
        organDonor: dto.organDonor,
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

  async findAll() {
    return this.prisma.medicalRecord.findMany({
      include: {
        patient: {
          include: {
            person: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const record =
      await this.prisma.medicalRecord.findUnique({
        where: {
          id,
        },
        include: {
          patient: {
            include: {
              person: true,
            },
          },

          encounters: {
            orderBy: {
              startedAt: 'desc',
            },
          },
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Medical record not found.',
      );
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdateMedicalRecordDto,
  ) {
    await this.findOne(id);

    return this.prisma.medicalRecord.update({
      where: {
        id,
      },
      data: {
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        chronicConditions: dto.chronicConditions,
        pastMedicalHistory:
          dto.pastMedicalHistory,
        surgicalHistory:
          dto.surgicalHistory,
        familyHistory: dto.familyHistory,
        socialHistory: dto.socialHistory,
        currentMedications:
          dto.currentMedications,
        immunizationNotes:
          dto.immunizationNotes,
        organDonor: dto.organDonor,
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

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.medicalRecord.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Medical record deleted successfully.',
    };
  }
}