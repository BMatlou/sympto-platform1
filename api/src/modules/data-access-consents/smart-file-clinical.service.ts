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
    const consent = await this.prisma.dataAccessConsent.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Clinical data access consent not found.');
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
        healthPassport: {
          include: {
            allergies: { include: { allergy: true } },
            conditions: { include: { condition: true } },
            immunizations: { include: { immunization: true } },
            medications: { include: { medication: true } },
            patientDiagnoses: { include: { diagnosis: true } },
            patientProcedures: { include: { procedure: true } },
          },
        },
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
        referrals: true,
        healthJournals: true,
        labOrders: { include: { items: true } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found.');

    const orderItemIds = patient.labOrders.flatMap((order) => order.items.map((item) => item.id));

    const [encounters, labResults, imagingStudies] = await Promise.all([
      this.prisma.encounter.findMany({
        where: patient.medicalRecord ? { medicalRecordId: patient.medicalRecord.id } : { id: '__none__' },
        orderBy: { startedAt: 'desc' },
        include: {
          encounterType: true,
          practitioner: { include: { person: true } },
          diagnoses: true,
          procedures: true,
          prescriptions: true,
          labOrders: true,
          labResults: true,
          symptomLogs: true,
          clinicalNotes: true,
        },
      }),
      orderItemIds.length
        ? this.prisma.labResult.findMany({ where: { orderItemId: { in: orderItemIds } }, orderBy: { reportedAt: 'desc' } })
        : Promise.resolve([]),
      this.prisma.imagingStudy.findMany({ where: { patientId: patient.id }, orderBy: { performedAt: 'desc' } }),
    ]);

    const encounterIds = encounters.map((encounter) => encounter.id);
    const clinicalVitals = encounterIds.length
      ? await this.prisma.clinicalVital.findMany({
          where: { encounterId: { in: encounterIds } },
          orderBy: { measuredAt: 'desc' },
          include: { vitalType: true },
        })
      : [];

    const passport = patient.healthPassport;
    const diagnoses = [
      ...(passport?.patientDiagnoses ?? []),
      ...encounters.flatMap((encounter) => encounter.diagnoses),
    ];
    const procedures = [
      ...(passport?.patientProcedures ?? []),
      ...encounters.flatMap((encounter) => encounter.procedures),
    ];

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
      healthPassport: consent.canViewHealthPassport ? passport : null,
      conditions: passport?.conditions ?? [],
      allergies: passport?.allergies ?? [],
      immunisations: passport?.immunizations ?? [],
      medications: consent.canViewPrescriptions ? passport?.medications ?? [] : [],
      prescriptions: consent.canViewPrescriptions ? patient.prescriptions : [],
      encounters,
      episodes: patient.clinicalEpisodes,
      vitals: clinicalVitals,
      symptoms: encounters.flatMap((encounter) => encounter.symptomLogs),
      diagnoses,
      procedures,
      labResults: consent.canViewLabResults ? labResults : [],
      imaging: consent.canViewImaging ? imagingStudies : [],
      carePlans: patient.carePlans,
      referrals: patient.referrals,
      clinicalDocuments: [
        ...patient.identityDocuments,
        ...encounters.flatMap((encounter) => encounter.clinicalNotes),
      ],
      generatedAt: now,
    };
  }
}
