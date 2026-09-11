import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClinicCardService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        person: true,
        emergencyContacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 5 },
        patientInsurances: {
          where: { active: true },
          include: { insurancePolicy: { include: { provider: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        medicalRecord: true,
        baseline: true,
        healthPassport: {
          include: {
            allergies: { include: { allergy: true } },
            conditions: { include: { condition: true } },
            medications: { include: { medication: true } },
            immunizations: { include: { immunization: true }, orderBy: { administeredAt: 'desc' }, take: 10 },
            patientDiagnoses: {
              include: { diagnosis: true, encounter: { include: { practitioner: { include: { person: true } } } } },
              orderBy: { diagnosedAt: 'desc' },
              take: 10,
            },
            patientProcedures: {
              include: { procedure: true, encounter: { include: { practitioner: { include: { person: true } } } } },
              orderBy: { performedAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!patient) throw new NotFoundException('Patient profile not found for the authenticated user.');

    const passport = patient.healthPassport;
    const activeAllergies = (passport?.allergies ?? []).filter((item) => String(item.status) === 'ACTIVE');
    const activeConditions = (passport?.conditions ?? []).filter((item) => String(item.status) === 'ACTIVE');
    const activeMedications = (passport?.medications ?? []).filter((item) => String(item.status) === 'ACTIVE' && item.ongoing);
    const activeDiagnoses = (passport?.patientDiagnoses ?? []).filter((item) => ['ACTIVE', 'RECURRENT', 'REMISSION'].includes(String(item.status)));
    const completedProcedures = (passport?.patientProcedures ?? []).filter((item) => String(item.status) !== 'CANCELLED');

    const practitionerName = (value: any) => {
      const person = value?.encounter?.practitioner?.person;
      return person ? [person.preferredName ?? person.firstName, person.lastName].filter(Boolean).join(' ') : null;
    };

    const heightCm = patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null;
    const weightKg = patient.weightKg != null ? Number(patient.weightKg) : patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null;
    const calculatedBmi = heightCm && weightKg && heightCm > 0 && weightKg > 0 ? Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(2)) : null;

    const organDonorMeta = await this.prisma.$queryRaw<Array<{ organDonorRecorded: boolean }>>(
      Prisma.sql`SELECT "organDonorRecorded" FROM "HealthPassport" WHERE "patientId" = ${patient.id} LIMIT 1`,
    );

    const updatedDates = [passport?.updatedAt, ...activeAllergies.map((item) => item.updatedAt), ...activeConditions.map((item) => item.updatedAt), ...activeMedications.map((item) => item.updatedAt), ...activeDiagnoses.map((item) => item.updatedAt), ...completedProcedures.map((item) => item.updatedAt)].filter(Boolean) as Date[];

    return {
      generatedAt: new Date().toISOString(),
      lastUpdatedAt: updatedDates.length ? new Date(Math.max(...updatedDates.map((value) => value.getTime()))).toISOString() : null,
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        firstName: patient.person.firstName,
        middleName: patient.person.middleName,
        lastName: patient.person.lastName,
        preferredName: patient.person.preferredName,
        dateOfBirth: patient.person.dateOfBirth,
        gender: patient.person.gender,
        profileImageUrl: patient.person.profileImageUrl,
      },
      emergency: {
        bloodType: passport?.bloodType ?? patient.medicalRecord?.bloodType ?? null,
        rhesusFactor: passport?.rhesusFactor ?? null,
        organDonor: passport?.organDonor ?? patient.medicalRecord?.organDonor ?? false,
        organDonorRecorded: organDonorMeta[0]?.organDonorRecorded === true,
        emergencyNotes: passport?.emergencyNotes ?? null,
        contacts: patient.emergencyContacts,
      },
      vitals: {
        heightCm,
        weightKg,
        bmi: calculatedBmi ?? (patient.baseline?.bmi != null ? Number(patient.baseline.bmi) : null),
      },
      allergies: activeAllergies.map((item) => ({ id: item.id, name: item.allergy.name, severity: item.severity, reaction: item.reaction, reactionNotes: item.reactionNotes, onsetDate: item.onsetDate, verified: item.verified, verifiedBy: item.verifiedBy, source: item.verified || item.verifiedBy ? 'PRACTITIONER' : 'PATIENT', status: item.status })),
      conditions: activeConditions.map((item) => ({ id: item.id, name: item.condition.name, severity: item.severity, stage: item.stage, chronic: item.chronic, primaryCondition: item.primaryCondition, diagnosedAt: item.diagnosedAt, diagnosedBy: item.diagnosedBy, treatmentPlan: item.treatmentPlan, source: item.diagnosedBy || item.treatmentPlan ? 'PRACTITIONER' : 'PATIENT', status: item.status })),
      diagnoses: activeDiagnoses.map((item) => ({ id: item.id, name: item.diagnosis.name, category: item.diagnosis.category, bodySystem: item.diagnosis.bodySystem, diagnosedAt: item.diagnosedAt, resolvedAt: item.resolvedAt, status: item.status, severity: item.severity, stage: item.stage, primaryDiagnosis: item.primaryDiagnosis, confirmed: item.confirmed, diagnosedBy: item.diagnosedBy, practitionerName: practitionerName(item), treatmentPlan: item.treatmentPlan, outcome: item.outcome, notes: item.notes })),
      medications: activeMedications.map((item) => ({ id: item.id, name: item.medication.name, genericName: item.medication.genericName, dosage: item.dosage, frequency: item.frequency, route: item.route, indication: item.indication, instructions: item.instructions, prescribedBy: item.prescribedBy, startedAt: item.startedAt })),
      immunizations: (passport?.immunizations ?? []).map((item) => ({ id: item.id, name: item.immunization.name, administeredAt: item.administeredAt, doseNumber: item.doseNumber, administeredBy: item.administeredBy, facility: item.facility, nextDueDate: item.nextDueDate, status: item.status, source: item.administeredBy || item.facility ? 'PRACTITIONER' : 'PATIENT' })),
      procedures: completedProcedures.map((item) => ({ id: item.id, name: item.procedure.name, category: item.procedure.category, bodySystem: item.procedure.bodySystem, surgical: item.procedure.surgical, performedAt: item.performedAt, status: item.status, outcome: item.outcome, performer: item.performer, facility: item.facility, followUpRequired: item.followUpRequired, followUpDate: item.followUpDate, practitionerName: practitionerName(item), notes: item.notes })),
      coverage: patient.patientInsurances.map((item) => ({ id: item.id, providerName: item.insurancePolicy.provider.name, planName: item.insurancePolicy.name, membershipNumber: item.membershipNumber, effectiveFrom: item.effectiveFrom, effectiveTo: item.effectiveTo })),
    };
  }
}
