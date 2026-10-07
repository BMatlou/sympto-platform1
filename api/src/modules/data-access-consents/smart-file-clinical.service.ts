import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CreateSmartFileClinicalUpdateDto,
  SmartFilePrescriptionDto,
} from './dto/create-smart-file-clinical-update.dto';
import { SmartFileClinicalResponse } from './dto/smart-file-clinical-response.dto';

@Injectable()
export class SmartFileClinicalService {
  constructor(private readonly prisma: PrismaService) {}

  async getClinicalFile(
    practitionerUserId: string,
    consentId: string,
  ): Promise<SmartFileClinicalResponse> {
    const consent = await this.requireClinicalConsent(practitionerUserId, consentId);

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
            patientDiagnoses: { include: { diagnosis: true, encounter: true } },
            patientProcedures: { include: { procedure: true, encounter: true } },
          },
        },
        medicalRecord: true,
        identityDocuments: true,
        appointments: consent.canViewAppointments
          ? {
              orderBy: { scheduledStart: 'desc' },
              include: {
                practitioner: { include: { person: true } },
                practice: true,
                encounter: true,
              },
            }
          : false,
        prescriptions: consent.canViewPrescriptions
          ? {
              orderBy: { issuedAt: 'desc' },
              include: {
                items: { include: { medication: true } },
                practitioner: { include: { person: true } },
                encounter: { include: { encounterType: true } },
              },
            }
          : false,
        clinicalEpisodes: consent.canViewMedicalRecords
          ? {
              orderBy: { startedAt: 'desc' },
              include: {
                practitioner: { include: { person: true } },
                encounter: {
                  include: {
                    practitioner: { include: { person: true } },
                    encounterType: true,
                  },
                },
                symptomLogs: {
                  orderBy: { startedAt: 'desc' },
                  include: {
                    symptoms: { include: { symptom: true } },
                    triggers: true,
                    medicationEffects: {
                      include: { medication: true, prescription: true },
                    },
                    observations: true,
                    attachments: true,
                  },
                },
                diagnoses: { include: { diagnosis: true } },
                clinicalNotes: true,
                clinicalVitals: { include: { vitalType: true } },
                prescriptions: {
                  include: {
                    items: { include: { medication: true } },
                    practitioner: { include: { person: true } },
                  },
                },
                labOrders: { include: { items: { include: { test: true } } } },
                labResults: {
                  include: { items: { include: { test: true } } },
                },
                imagingOrders: {
                  include: { items: { include: { procedure: true } } },
                },
                imagingStudies: {
                  include: {
                    reports: {
                      include: {
                        practitioner: { include: { person: true } },
                      },
                    },
                  },
                },
                carePlans: {
                  include: { goals: true, notes: true, tasks: true },
                },
                referrals: true,
                attachments: true,
              },
            }
          : false,
        carePlans: consent.canViewMedicalRecords
          ? {
              orderBy: { createdAt: 'desc' },
              include: {
                practitioner: { include: { person: true } },
                goals: true,
                notes: true,
                tasks: true,
              },
            }
          : false,
        referrals: consent.canViewMedicalRecords
          ? {
              orderBy: { createdAt: 'desc' },
              include: {
                referringPractitioner: { include: { person: true } },
                receivingPractitioner: { include: { person: true } },
                referringPractice: true,
                receivingPractice: true,
                documents: true,
                notes: true,
                statusHistory: true,
              },
            }
          : false,
        healthJournals: consent.canViewMedicalRecords
          ? {
              orderBy: { createdAt: 'desc' },
              include: {
                practitioner: { include: { person: true } },
                encounter: true,
              },
            }
          : false,
        wearableDevices: consent.canViewWearables
          ? {
              select: {
                id: true,
                manufacturer: true,
                model: true,
                deviceType: true,
                status: true,
              },
            }
          : false,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const passport = patient.healthPassport;
    const prescriptions = Array.isArray(patient.prescriptions) ? patient.prescriptions : [];
    const appointments = Array.isArray(patient.appointments) ? patient.appointments : [];
    const episodes = Array.isArray(patient.clinicalEpisodes) ? patient.clinicalEpisodes : [];
    const carePlans = Array.isArray(patient.carePlans) ? patient.carePlans : [];
    const referrals = Array.isArray(patient.referrals) ? patient.referrals : [];
    const healthJournals = Array.isArray(patient.healthJournals) ? patient.healthJournals : [];
    const wearableDevices = Array.isArray(patient.wearableDevices) ? patient.wearableDevices : [];

    const encounters = consent.canViewMedicalRecords
      ? await this.prisma.encounter.findMany({
          where: { medicalRecord: { patientId: patient.id } },
          orderBy: { startedAt: 'desc' },
          include: {
            encounterType: true,
            practitioner: { include: { person: true } },
            diagnoses: { include: { diagnosis: true } },
            procedures: { include: { procedure: true } },
            clinicalNotes: true,
            vitals: { include: { vitalType: true } },
            prescriptions: {
              include: {
                items: { include: { medication: true } },
                practitioner: { include: { person: true } },
              },
            },
            labOrders: { include: { items: { include: { test: true } } } },
            imagingOrders: {
              include: { items: { include: { procedure: true } } },
            },
            imagingStudies: {
              include: {
                reports: {
                  include: { practitioner: { include: { person: true } } },
                },
              },
            },
            carePlans: { include: { goals: true, notes: true, tasks: true } },
            referrals: true,
          },
        })
      : [];

    const labOrderItems = consent.canViewLabResults
      ? await this.prisma.labOrderItem.findMany({
          where: { order: { patientId: patient.id } },
          select: { id: true },
        })
      : [];

    const labResults =
      consent.canViewLabResults && labOrderItems.length
        ? await this.prisma.labResult.findMany({
            where: {
              orderItemId: { in: labOrderItems.map((item) => item.id) },
            },
            orderBy: { reportedAt: 'desc' },
            include: {
              specimen: true,
              orderItem: {
                include: {
                  test: true,
                  order: {
                    include: {
                      laboratory: true,
                      practitioner: { include: { person: true } },
                      appointment: true,
                    },
                  },
                },
              },
              items: { include: { test: true } },
              attachments: true,
              verifications: {
                include: { practitioner: { include: { person: true } } },
              },
              amendments: {
                include: { practitioner: { include: { person: true } } },
              },
              criticalResults: {
                include: { practitioner: { include: { person: true } } },
              },
            },
          })
        : [];

    const imaging = consent.canViewImaging
      ? await this.prisma.imagingStudy.findMany({
          where: { patientId: patient.id },
          orderBy: { performedAt: 'desc' },
          include: {
            order: {
              include: {
                practitioner: { include: { person: true } },
                appointment: true,
                imagingCenter: true,
                items: { include: { procedure: true } },
              },
            },
            imagingCenter: true,
            practitioner: { include: { person: true } },
            encounter: true,
            reports: {
              include: {
                practitioner: { include: { person: true } },
              },
            },
          },
        })
      : [];

    const clinicalVitals = encounters.flatMap((encounter) =>
      encounter.vitals.map((vital) => ({
        ...vital,
        source: 'CLINICAL' as const,
      })),
    );

    const diagnoses = consent.canViewMedicalRecords
      ? [
          ...(passport?.patientDiagnoses ?? []).map((item) => ({
            ...item,
            source: 'CLINICAL' as const,
          })),
          ...encounters.flatMap((encounter) =>
            encounter.diagnoses.map((item) => ({
              ...item,
              source: 'CLINICAL' as const,
            })),
          ),
        ]
      : [];

    const procedures = consent.canViewMedicalRecords
      ? [
          ...(passport?.patientProcedures ?? []).map((item) => ({
            ...item,
            source: 'CLINICAL' as const,
          })),
          ...encounters.flatMap((encounter) =>
            encounter.procedures.map((item) => ({
              ...item,
              source: 'CLINICAL' as const,
            })),
          ),
        ]
      : [];

    const symptoms = consent.canViewMedicalRecords
      ? episodes.flatMap((episode) =>
          episode.symptomLogs.map((symptomLog) => ({
            ...symptomLog,
            source: episode.practitionerId ? 'CLINICAL' : 'PATIENT',
          })),
        )
      : [];

    const patientVitals = healthJournals.flatMap((entry) => {
      const values = [
        entry.temperature != null
          ? { type: 'Temperature', value: entry.temperature, unit: '°C' }
          : null,
        entry.bloodPressureSystolic != null || entry.bloodPressureDiastolic != null
          ? {
              type: 'Blood pressure',
              value:
                String(entry.bloodPressureSystolic ?? '—') +
                '/' +
                String(entry.bloodPressureDiastolic ?? '—'),
              unit: 'mmHg',
            }
          : null,
        entry.heartRate != null
          ? { type: 'Heart rate', value: entry.heartRate, unit: 'bpm' }
          : null,
        entry.oxygenSaturation != null
          ? { type: 'Oxygen saturation', value: entry.oxygenSaturation, unit: '%' }
          : null,
        entry.respiratoryRate != null
          ? { type: 'Respiratory rate', value: entry.respiratoryRate, unit: '/min' }
          : null,
        entry.weightKg != null
          ? { type: 'Weight', value: entry.weightKg, unit: 'kg' }
          : null,
      ].filter(Boolean) as Array<{ type: string; value: unknown; unit: string }>;

      return values.map((vital) => ({
        ...vital,
        recordedAt: entry.createdAt,
        source: entry.practitionerId ? 'CLINICAL' : 'PATIENT',
        journalId: entry.id,
      }));
    });

    const patientMeasurements = consent.canViewWearables
      ? await this.prisma.deviceMeasurement.findMany({
          where: { device: { patientId: patient.id } },
          orderBy: { measuredAt: 'desc' },
          include: {
            device: {
              select: {
                id: true,
                manufacturer: true,
                model: true,
                deviceType: true,
              },
            },
          },
        })
      : [];

    const wearableWellnessMetrics = consent.canViewWearables
      ? await this.prisma.wearableWellnessMetric.findMany({
          where: { patientId: patient.id },
          orderBy: { measuredAt: 'desc' },
          include: {
            device: {
              select: {
                id: true,
                manufacturer: true,
                model: true,
                deviceType: true,
              },
            },
          },
        })
      : [];

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
      clinicalAccess: {
        canView: true,
        canUpdate: consent.canUpdateClinicalRecords,
        consentExpiresAt: consent.expiresAt,
      },
      healthPassport: consent.canViewHealthPassport ? passport : null,
      medicalRecord: consent.canViewMedicalRecords ? patient.medicalRecord : null,
      conditions: consent.canViewHealthPassport ? passport?.conditions ?? [] : [],
      allergies: consent.canViewHealthPassport ? passport?.allergies ?? [] : [],
      immunisations: consent.canViewHealthPassport ? passport?.immunizations ?? [] : [],
      medications: consent.canViewPrescriptions ? passport?.medications ?? [] : [],
      prescriptions,
      appointments,
      encounters,
      episodes,
      vitals: clinicalVitals,
      patientVitals,
      symptoms,
      diagnoses,
      procedures,
      labResults,
      imaging,
      carePlans,
      referrals,
      clinicalDocuments: consent.canViewMedicalRecords
        ? [
            ...patient.identityDocuments.map((document) => ({
              ...document,
              source: 'CLINICAL' as const,
            })),
            ...encounters.flatMap((encounter) =>
              encounter.clinicalNotes.map((note) => ({
                ...note,
                source: 'CLINICAL' as const,
              })),
            ),
            ...episodes.flatMap((episode) =>
              episode.attachments.map((attachment) => ({
                ...attachment,
                source: 'CLINICAL' as const,
              })),
            ),
          ]
        : [],
      healthJournalEntries: healthJournals.map((entry) => ({
        ...entry,
        source: entry.practitionerId ? 'CLINICAL' : 'PATIENT',
      })),
      patientMeasurements,
      wearableWellnessMetrics,
      wearableDevices,
      generatedAt: new Date(),
    };
  }

  async searchMedications(
    practitionerUserId: string,
    consentId: string,
    search?: string,
  ) {
    await this.requireClinicalWriteAccess(practitionerUserId, consentId);
    const normalized = search?.trim();

    return this.prisma.medication.findMany({
      where: {
        active: true,
        searchable: true,
        ...(normalized
          ? {
              OR: [
                { name: { contains: normalized, mode: 'insensitive' } },
                { genericName: { contains: normalized, mode: 'insensitive' } },
                { brandName: { contains: normalized, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        brandName: true,
      },
      orderBy: [{ genericName: 'asc' }, { name: 'asc' }],
      take: 20,
    });
  }

  async createClinicalUpdate(
    practitionerUserId: string,
    consentId: string,
    dto: CreateSmartFileClinicalUpdateDto,
  ) {
    const { patient, practitioner } = await this.requireClinicalWriteAccess(
      practitionerUserId,
      consentId,
    );

    const hasClinicalContent = [
      dto.chiefComplaint,
      dto.assessment,
      dto.plan,
      dto.notes,
      dto.startedAt,
      dto.endedAt,
      dto.encounterTypeId,
    ].some(
      (value) => value !== undefined && String(value).trim() !== '',
    );

    if (!hasClinicalContent && !dto.prescription) {
      throw new BadRequestException(
        'Add a clinical update or prescription before saving.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const medicalRecord = await tx.medicalRecord.upsert({
        where: { patientId: patient.id },
        update: {},
        create: { patientId: patient.id },
        select: { id: true },
      });

      const encounterType = dto.encounterTypeId
        ? await tx.encounterType.findUnique({
            where: { id: dto.encounterTypeId },
            select: { id: true },
          })
        : await tx.encounterType.upsert({
            where: { name: 'Clinical consultation' },
            update: {},
            create: {
              name: 'Clinical consultation',
              description: 'Clinical consultation recorded through Smart File.',
            },
            select: { id: true },
          });

      if (!encounterType) {
        throw new NotFoundException('Clinical encounter type not found.');
      }

      const encounter = await tx.encounter.create({
        data: {
          medicalRecordId: medicalRecord.id,
          practitionerId: practitioner.id,
          encounterTypeId: encounterType.id,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
          endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
          chiefComplaint:
            dto.chiefComplaint?.trim() ||
            (dto.prescription
              ? 'Medication review / prescription'
              : undefined),
          assessment: dto.assessment?.trim(),
          plan: dto.plan?.trim(),
          notes: dto.notes?.trim(),
        },
        include: {
          encounterType: true,
          practitioner: { include: { person: true } },
        },
      });

      const prescription = dto.prescription
        ? await this.createPrescriptionInTransaction(
            tx,
            patient.id,
            practitioner.id,
            encounter.id,
            dto.prescription,
          )
        : null;

      const prescriptionId = prescription?.id ?? null;

      await tx.auditLog.create({
        data: {
          userId: practitionerUserId,
          action: AuditAction.CREATE,
          entityType: 'SmartFileClinicalUpdate',
          entityId: encounter.id,
          newValues: {
            consentId,
            patientId: patient.id,
            prescriptionId,
          },
          success: true,
        },
      });

      if (prescriptionId) {
        await tx.auditLog.create({
          data: {
            userId: practitionerUserId,
            action: AuditAction.CREATE,
            entityType: 'Prescription',
            entityId: prescriptionId,
            newValues: {
              consentId,
              patientId: patient.id,
              encounterId: encounter.id,
            },
            success: true,
          },
        });
      }

      return {
        encounter,
        prescription,
        recordedBy: {
          practitionerId: practitioner.id,
          name:
            practitioner.person.firstName +
            ' ' +
            practitioner.person.lastName,
          registrationNumber: practitioner.registrationNumber,
        },
        smartFile: 'updated',
      };
    });
  }

  private async createPrescriptionInTransaction(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitionerId: string,
    encounterId: string,
    dto: SmartFilePrescriptionDto,
  ) {
    const medication = await tx.medication.findUnique({
      where: { id: dto.medicationId },
      select: { id: true },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found.');
    }

    return tx.prescription.create({
      data: {
        encounterId,
        patientId,
        practitionerId,
        status: 'ACTIVE',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes?.trim(),
        items: {
          create: {
            medicationId: dto.medicationId,
            dosage: dto.dosage.trim(),
            frequency: dto.frequency,
            route: dto.route,
            durationDays: dto.durationDays,
            quantity: dto.quantity,
            refills: dto.refills ?? 0,
            instructions: dto.instructions?.trim(),
          },
        },
      },
      include: {
        items: { include: { medication: true } },
        practitioner: { include: { person: true } },
        encounter: { include: { encounterType: true } },
      },
    });
  }

  private async requireClinicalConsent(
    practitionerUserId: string,
    consentId: string,
  ) {
    const consent = await this.prisma.dataAccessConsent.findUnique({
      where: { id: consentId },
      include: {
        grantedTo: {
          include: {
            practitioner: {
              include: { person: true },
            },
          },
        },
        patient: {
          select: { id: true },
        },
      },
    });

    if (!consent) {
      throw new NotFoundException('Clinical data access consent not found.');
    }

    if (consent.grantedToUserId !== practitionerUserId) {
      throw new ForbiddenException(
        'This consent is not granted to this clinician.',
      );
    }

    const now = new Date();

    if (
      consent.revokedAt ||
      (consent.expiresAt && consent.expiresAt <= now)
    ) {
      throw new ForbiddenException(
        'Clinical data access consent is no longer active.',
      );
    }

    if (!consent.canViewMedicalRecords) {
      throw new ForbiddenException(
        'Clinical medical-record access is not permitted.',
      );
    }

    const practitioner = consent.grantedTo.practitioner;

    if (
      !practitioner ||
      practitioner.status !== 'ACTIVE' ||
      !practitioner.verified
    ) {
      throw new ForbiddenException(
        'The clinician account is not verified and active.',
      );
    }

    return {
      consent,
      patient: consent.patient,
      practitioner,
    };
  }

  private async requireClinicalWriteAccess(
    practitionerUserId: string,
    consentId: string,
  ) {
    const result = await this.requireClinicalConsent(
      practitionerUserId,
      consentId,
    );

    if (!result.consent.canUpdateClinicalRecords) {
      throw new ForbiddenException('This Smart File share is read-only.');
    }

    return result;
  }
}
