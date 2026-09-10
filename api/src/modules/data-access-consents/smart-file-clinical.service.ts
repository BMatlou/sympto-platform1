import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SmartFileClinicalResponse } from './dto/smart-file-clinical-response.dto';

@Injectable()
export class SmartFileClinicalService {
  constructor(private readonly prisma: PrismaService) {}

  async getClinicalFile(
    practitionerUserId: string,
    consentId: string,
  ): Promise<SmartFileClinicalResponse> {
    const consent = await this.prisma.dataAccessConsent.findUnique({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException('Clinical data access consent not found.');
    }

    if (consent.grantedToUserId !== practitionerUserId) {
      throw new ForbiddenException('This consent is not granted to this practitioner.');
    }

    const now = new Date();
    if (consent.revokedAt || (consent.expiresAt && consent.expiresAt <= now)) {
      throw new ForbiddenException('Clinical data access consent is no longer active.');
    }

    if (!consent.canViewMedicalRecords) {
      throw new ForbiddenException('Clinical medical-record access is not permitted.');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: consent.patientId },
      include: {
        person: true,
        healthPassport: true,
        medicalRecord: true,
        identityDocuments: true,
        prescriptions: {
          orderBy: { issuedAt: 'desc' },
          include: {
            items: { include: { medication: true } },
            practitioner: { include: { person: true } },
          },
        },
        clinicalEpisodes: true,
        carePlans: true,
        diagnoses: true,
        procedures: true,
        referrals: true,
        healthJournals: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const [encounters, labResults, imagingStudies] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { medicalRecord: { patientId: patient.id } },
        orderBy: { startedAt: 'desc' },
        include: {
          encounterType: true,
          practitioner: { include: { person: true } },
          diagnoses: true,
          procedures: true,
          clinicalVitals: true,
          prescriptions: true,
          labOrders: true,
          labResults: true,
          symptomLogs: true,
          clinicalNotes: true,
        },
      }),
      this.prisma.labResult.findMany({
        where: { orderItem: { order: { patientId: patient.id } } },
        orderBy: { reportedAt: 'desc' },
        include: {
          items: { include: { test: true } },
          attachments: true,
        },
      }),
      this.prisma.imagingStudy.findMany({
        where: { patientId: patient.id },
        orderBy: { performedAt: 'desc' },
        include: {
          order: { include: { items: { include: { procedure: true } } } },
        },
      }),
    ]);

    return {
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        firstName: patient.person.firstName,
        middleName: patient.person.middleName,
        lastName: patient.person.lastName,
        preferredName: patient.person.preferredName,
        dateOfBirth: patient.person.dateOfBirth,
        gender: patient.person.gender,
      },
      healthPassport: consent.canViewHealthPassport ? patient.healthPassport : null,
      conditions: patient.diagnoses,
      allergies: patient.medicalRecord?.allergies ? [patient.medicalRecord.allergies] : [],
      immunisations: [],
      medications: patient.prescriptions.flatMap((p) => p.items),
      prescriptions: consent.canViewPrescriptions ? patient.prescriptions : [],
      encounters: consent.canViewMedicalRecords ? encounters : [],
      episodes: patient.clinicalEpisodes,
      vitals: encounters.flatMap((e) => e.clinicalVitals),
      symptoms: encounters.flatMap((e) => e.symptomLogs),
      diagnoses: patient.diagnoses,
      procedures: patient.procedures,
      labResults: consent.canViewLabResults ? labResults : [],
      imaging: consent.canViewImaging ? imagingStudies : [],
      carePlans: patient.carePlans,
      referrals: patient.referrals,
      clinicalDocuments: [],
      generatedAt: now,
    };
  }
}
