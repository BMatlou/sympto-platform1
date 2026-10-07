import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClinicCardService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        person: true,
        emergencyContacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        patientInsurances: {
          where: { active: true },
          include: { insurancePolicy: { include: { provider: true } } },
          orderBy: { createdAt: 'desc' },
        },
        medicalRecord: true,
        baseline: true,
        healthPassport: {
          include: {
            allergies: { include: { allergy: true } },
            conditions: { include: { condition: true } },
            medications: { include: { medication: true } },
            immunizations: { include: { immunization: true }, orderBy: { administeredAt: 'desc' } },
            patientDiagnoses: {
              include: { diagnosis: true, encounter: { include: { practitioner: { include: { person: true } } } } },
              orderBy: { diagnosedAt: 'desc' },
            },
            patientProcedures: {
              include: { procedure: true, encounter: { include: { practitioner: { include: { person: true } } } } },
              orderBy: { performedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!patient) throw new NotFoundException('Patient profile not found for the authenticated user.');

    const passport = patient.healthPassport;
    const clinicalPassportAudits = passport
      ? await this.prisma.auditLog.findMany({
          where: {
            entityType: 'SmartFileClinical/HEALTH_PASSPORT',
            entityId: passport.id,
            action: { in: ['CREATE', 'UPDATE'] },
            success: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { newValues: true },
        })
      : [];

    const clinicalPassportFields = new Set<string>();
    for (const audit of clinicalPassportAudits) {
      const values = audit.newValues && typeof audit.newValues === 'object' && !Array.isArray(audit.newValues)
        ? audit.newValues as Record<string, unknown>
        : null;
      for (const field of ['bloodType', 'rhesusFactor', 'organDonor', 'emergencyNotes']) {
        if (values && Object.prototype.hasOwnProperty.call(values, field)) clinicalPassportFields.add(field);
      }
    }

    // Prescription-backed medications are authoritative clinical records.
    // Direct Smart File medication writes are also treated as clinical when the
    // stored prescriber matches an authorised practitioner.
    const medicationIds = (passport?.medications ?? []).map((item) => item.medicationId);
    const prescriptionItems = medicationIds.length
      ? await this.prisma.prescriptionItem.findMany({
          where: {
            medicationId: { in: medicationIds },
            prescription: {
              patientId: patient.id,
              status: { not: 'DRAFT' },
            },
          },
          include: {
            prescription: {
              include: {
                practitioner: { include: { person: true } },
              },
            },
          },
          orderBy: { prescription: { issuedAt: 'desc' } },
        })
      : [];

    const clinicalMedicationIds = new Set(prescriptionItems.map((item) => item.medicationId));
    const clinicalMedicationById = new Map(
      prescriptionItems.map((item) => [
        item.medicationId,
        [item.prescription.practitioner.person.preferredName ?? item.prescription.practitioner.person.firstName, item.prescription.practitioner.person.lastName]
          .filter(Boolean)
          .join(' '),
      ]),
    );
    const practitioners = await this.prisma.practitioner.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING'] } },
      select: {
        person: { select: { firstName: true, lastName: true, preferredName: true } },
      },
    });
    const normaliseName = (value: unknown) =>
      String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const practitionerNames = new Set(
      practitioners.flatMap((practitioner) => [
        normaliseName(practitioner.person.preferredName),
        normaliseName([practitioner.person.preferredName ?? practitioner.person.firstName, practitioner.person.lastName].filter(Boolean).join(' ')),
        normaliseName([practitioner.person.firstName, practitioner.person.lastName].filter(Boolean).join(' ')),
      ]).filter(Boolean),
    );

    const activeAllergies = (passport?.allergies ?? []).filter((item) => String(item.status) === 'ACTIVE');
    const activeConditions = (passport?.conditions ?? []).filter((item) => String(item.status) === 'ACTIVE');
    const activeMedications = (passport?.medications ?? []).filter((item) => String(item.status) === 'ACTIVE' && item.ongoing);
    const activeDiagnoses = (passport?.patientDiagnoses ?? []).filter((item) => ['ACTIVE', 'RECURRENT', 'REMISSION'].includes(String(item.status)));
    const completedProcedures = (passport?.patientProcedures ?? []).filter((item) => String(item.status) !== 'CANCELLED');

    const auditIds = async (entityType: string, ids: string[]) => {
      if (!ids.length) return new Set<string>();
      const audits = await this.prisma.auditLog.findMany({
        where: {
          entityType,
          entityId: { in: ids },
          action: { in: ['CREATE', 'UPDATE'] },
          success: true,
        },
        select: { entityId: true },
      });
      return new Set(audits.map((audit) => audit.entityId));
    };

    const [clinicalAllergyRecordIds, clinicalConditionRecordIds, clinicalMedicationRecordIds, clinicalImmunizationRecordIds] = await Promise.all([
      auditIds('SmartFileClinical/ALLERGY', (passport?.allergies ?? []).map((item) => item.id)),
      auditIds('SmartFileClinical/CONDITION', (passport?.conditions ?? []).map((item) => item.id)),
      auditIds('SmartFileClinical/PATIENT_MEDICATION', (passport?.medications ?? []).map((item) => item.id)),
      auditIds('SmartFileClinical/IMMUNIZATION', (passport?.immunizations ?? []).map((item) => item.id)),
    ]);

    const practitionerName = (value: any) => {
      const person = value?.encounter?.practitioner?.person;
      return person ? [person.preferredName ?? person.firstName, person.lastName].filter(Boolean).join(' ') : null;
    };

    const heightCm = patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null;
    const weightKg = patient.weightKg != null ? Number(patient.weightKg) : patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null;
    const calculatedBmi = heightCm && weightKg && heightCm > 0 && weightKg > 0 ? Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(2)) : null;

    const encounterRows = await this.prisma.encounter.findMany({
      where: { medicalRecord: { patientId: patient.id } },
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: {
        encounterType: true,
        practitioner: { include: { person: true } },
        clinicalNotes: true,
        diagnoses: { include: { diagnosis: true } },
        procedures: { include: { procedure: true } },
        vitals: { include: { vitalType: true } },
      },
    });
    const clinicalEncounters = encounterRows.map((encounter) => ({
      id: encounter.id,
      type: encounter.encounterType.name,
      startedAt: encounter.startedAt,
      endedAt: encounter.endedAt,
      chiefComplaint: encounter.chiefComplaint,
      assessment: encounter.assessment,
      plan: encounter.plan,
      notes: encounter.notes,
      practitionerName: encounter.practitioner
        ? [encounter.practitioner.person.preferredName ?? encounter.practitioner.person.firstName, encounter.practitioner.person.lastName].filter(Boolean).join(' ')
        : null,
      diagnoses: encounter.diagnoses.map((item) => item.diagnosis.name),
      procedures: encounter.procedures.map((item) => item.procedure.name),
      clinicalNotes: encounter.clinicalNotes.map((note) => ({
        id: note.id,
        title: note.title,
        note: note.note,
        createdAt: note.createdAt,
      })),
      vitals: encounter.vitals.map((vital) => ({
        id: vital.id,
        type: vital.vitalType.name,
        unit: vital.vitalType.unit,
        value: Number(vital.value),
        measuredAt: vital.measuredAt,
      })),
      source: 'CLINICAL',
      sourceLabel: 'Clinical · view only',
    }));

    const updatedDates = [
      passport?.updatedAt,
      patient.medicalRecord?.updatedAt,
      patient.baseline?.updatedAt,
      ...activeAllergies.map((item) => item.updatedAt),
      ...activeConditions.map((item) => item.updatedAt),
      ...activeMedications.map((item) => item.updatedAt),
      ...(passport?.immunizations ?? []).map((item) => item.updatedAt),
      ...activeDiagnoses.map((item) => item.updatedAt),
      ...completedProcedures.map((item) => item.updatedAt),
    ].filter(Boolean) as Date[];

    return {
      generatedAt: new Date().toISOString(),
      lastUpdatedAt: updatedDates.length ? new Date(Math.max(...updatedDates.map((value) => value.getTime()))).toISOString() : null,
      clinicalLocks: {
        bloodType: clinicalPassportFields.has('bloodType'),
        rhesusFactor: clinicalPassportFields.has('rhesusFactor'),
        organDonor: clinicalPassportFields.has('organDonor'),
        emergencyNotes: clinicalPassportFields.has('emergencyNotes'),
      },
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
        clinicalLockedFields: Array.from(clinicalPassportFields),
        bloodType: passport?.bloodType ?? patient.medicalRecord?.bloodType ?? null,
        rhesusFactor: passport?.rhesusFactor ?? null,
        organDonor: passport?.organDonor ?? patient.medicalRecord?.organDonor ?? false,
        organDonorRecorded: passport?.organDonor !== undefined && passport?.organDonor !== null,
        emergencyNotes: passport?.emergencyNotes ?? null,
        contacts: patient.emergencyContacts,
      },
      vitals: {
        heightCm,
        weightKg,
        bmi: calculatedBmi ?? (patient.baseline?.bmi != null ? Number(patient.baseline.bmi) : null),
      },
      baseline: patient.baseline
        ? {
            weightKg: patient.baseline.weightKg != null ? Number(patient.baseline.weightKg) : null,
            heightCm: patient.baseline.heightCm != null ? Number(patient.baseline.heightCm) : null,
            bmi: patient.baseline.bmi != null ? Number(patient.baseline.bmi) : null,
            systolicPressure: patient.baseline.systolicPressure,
            diastolicPressure: patient.baseline.diastolicPressure,
            restingHeartRate: patient.baseline.restingHeartRate,
            respiratoryRate: patient.baseline.respiratoryRate,
            oxygenSaturation: patient.baseline.oxygenSaturation != null ? Number(patient.baseline.oxygenSaturation) : null,
            bodyTemperature: patient.baseline.bodyTemperature != null ? Number(patient.baseline.bodyTemperature) : null,
            bloodGlucose: patient.baseline.bloodGlucose != null ? Number(patient.baseline.bloodGlucose) : null,
            cholesterol: patient.baseline.cholesterol != null ? Number(patient.baseline.cholesterol) : null,
            notes: patient.baseline.notes,
            establishedAt: patient.baseline.establishedAt,
          }
        : null,
      clinicalEncounters,
      medicalHistory: {
        medicalRecord: patient.medicalRecord
          ? {
              bloodType: patient.medicalRecord.bloodType,
              organDonor: patient.medicalRecord.organDonor,
              allergies: patient.medicalRecord.allergies,
              chronicConditions: patient.medicalRecord.chronicConditions,
              pastMedicalHistory: patient.medicalRecord.pastMedicalHistory,
              surgicalHistory: patient.medicalRecord.surgicalHistory,
              familyHistory: patient.medicalRecord.familyHistory,
              socialHistory: patient.medicalRecord.socialHistory,
              currentMedications: patient.medicalRecord.currentMedications,
              immunizationNotes: patient.medicalRecord.immunizationNotes,
              createdAt: patient.medicalRecord.createdAt,
              updatedAt: patient.medicalRecord.updatedAt,
              source: 'CLINICAL',
              sourceLabel: 'Clinical · view only',
            }
          : null,
        previousConditions: (passport?.conditions ?? []).filter((item) => String(item.status) !== 'ACTIVE').map((item) => ({
          id: item.id,
          name: item.condition.name,
          status: item.status,
          severity: item.severity,
          diagnosedAt: item.diagnosedAt,
          resolvedAt: item.resolvedAt,
          diagnosedBy: item.diagnosedBy,
          outcome: item.outcome,
          notes: item.notes,
          source: clinicalConditionRecordIds.has(item.id) || Boolean(item.diagnosedBy || item.treatmentPlan) ? 'CLINICAL' : 'PATIENT',
        })),
        previousMedications: (passport?.medications ?? []).filter((item) => String(item.status) !== 'ACTIVE' || !item.ongoing).map((item) => ({
          id: item.id,
          name: item.medication.name,
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          status: item.status,
          prescribedBy: item.prescribedBy,
          source: clinicalMedicationIds.has(item.medicationId) || clinicalMedicationRecordIds.has(item.id) || practitionerNames.has(normaliseName(item.prescribedBy)) ? 'CLINICAL' : 'PATIENT',
        })),
        clinicalDiagnoses: (passport?.patientDiagnoses ?? []).map((item) => ({
          id: item.id,
          name: item.diagnosis.name,
          status: item.status,
          diagnosedAt: item.diagnosedAt,
          resolvedAt: item.resolvedAt,
          diagnosedBy: item.diagnosedBy,
          practitionerName: practitionerName(item),
          outcome: item.outcome,
          source: 'CLINICAL',
        })),
        procedures: (passport?.patientProcedures ?? []).map((item) => ({
          id: item.id,
          name: item.procedure.name,
          performedAt: item.performedAt,
          status: item.status,
          outcome: item.outcome,
          performer: item.performer,
          facility: item.facility,
          source: 'CLINICAL',
        })),
        immunizations: (passport?.immunizations ?? []).map((item) => ({
          id: item.id,
          name: item.immunization.name,
          administeredAt: item.administeredAt,
          doseNumber: item.doseNumber,
          status: item.status,
          administeredBy: item.administeredBy,
          facility: item.facility,
          source: clinicalImmunizationRecordIds.has(item.id) || Boolean(item.administeredBy || item.facility) ? 'CLINICAL' : 'PATIENT',
        })),
      },
      allergies: activeAllergies.map((item) => {
        const clinical = clinicalAllergyRecordIds.has(item.id) || Boolean(item.verifiedBy);
        return {
          id: item.id,
          name: item.allergy.name,
          category: item.allergy.category,
          description: item.allergy.description,
          severity: item.severity,
          reaction: item.reaction,
          reactionNotes: item.reactionNotes,
          onsetDate: item.onsetDate,
          lastReaction: item.lastReaction,
          verified: item.verified,
          verifiedBy: item.verifiedBy,
          notes: item.notes,
          source: clinical ? 'CLINICAL' : 'PATIENT',
          sourceLabel: clinical ? 'Clinical · view only' : 'Patient entered · editable',
          clinicalBy: item.verifiedBy ?? null,
          status: item.status,
          updatedAt: item.updatedAt,
        };
      }),
      conditions: activeConditions.map((item) => {
        const clinical = clinicalConditionRecordIds.has(item.id) || Boolean(item.diagnosedBy || item.treatmentPlan);
        return {
          id: item.id,
          name: item.condition.name,
          category: item.condition.category,
          bodySystem: item.condition.bodySystem,
          description: item.condition.description,
          severity: item.severity,
          stage: item.stage,
          chronic: item.chronic,
          primaryCondition: item.primaryCondition,
          diagnosedAt: item.diagnosedAt,
          resolvedAt: item.resolvedAt,
          diagnosedBy: item.diagnosedBy,
          treatmentPlan: item.treatmentPlan,
          outcome: item.outcome,
          notes: item.notes,
          source: clinical ? 'CLINICAL' : 'PATIENT',
          sourceLabel: clinical ? 'Clinical · view only' : 'Patient entered · editable',
          clinicalBy: item.diagnosedBy ?? null,
          status: item.status,
          updatedAt: item.updatedAt,
        };
      }),
      diagnoses: activeDiagnoses.map((item) => ({
        id: item.id,
        name: item.diagnosis.name,
        description: item.diagnosis.description,
        category: item.diagnosis.category,
        bodySystem: item.diagnosis.bodySystem,
        chronic: item.diagnosis.chronic,
        diagnosedAt: item.diagnosedAt,
        resolvedAt: item.resolvedAt,
        status: item.status,
        severity: item.severity,
        stage: item.stage,
        primaryDiagnosis: item.primaryDiagnosis,
        confirmed: item.confirmed,
        diagnosedBy: item.diagnosedBy,
        practitionerName: practitionerName(item),
        treatmentPlan: item.treatmentPlan,
        outcome: item.outcome,
        notes: item.notes,
        source: 'CLINICAL',
        sourceLabel: 'Clinical · view only',
        clinicalBy: practitionerName(item),
        updatedAt: item.updatedAt,
      })),
      medications: activeMedications.map((item) => {
        const clinicianNamed = practitionerNames.has(normaliseName(item.prescribedBy));
        const clinical = clinicalMedicationIds.has(item.medicationId) || clinicalMedicationRecordIds.has(item.id) || clinicianNamed;
        return {
          id: item.id,
          medicationId: item.medicationId,
          name: item.medication.name,
          genericName: item.medication.genericName,
          brandName: item.medication.brandName,
          category: item.medication.category,
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          indication: item.indication,
          instructions: item.instructions,
          prescribedBy: item.prescribedBy,
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          ongoing: item.ongoing,
          adherencePercentage: item.adherencePercentage,
          missedDoses: item.missedDoses,
          sideEffects: item.sideEffects,
          effectiveness: item.effectiveness,
          status: item.status,
          notes: item.notes,
          source: clinical ? 'CLINICAL' : 'PATIENT',
          sourceLabel: clinical ? 'Clinical · view only' : 'Patient entered · editable',
          clinicalBy: clinicalMedicationById.get(item.medicationId) ?? (clinicianNamed ? item.prescribedBy : null),
          updatedAt: item.updatedAt,
        };
      }),
      immunizations: (passport?.immunizations ?? []).map((item) => {
        const clinical = clinicalImmunizationRecordIds.has(item.id) || Boolean(item.administeredBy || item.facility);
        return {
          id: item.id,
          name: item.immunization.name,
          category: item.immunization.category,
          diseaseProtected: item.immunization.diseaseProtected,
          description: item.immunization.description,
          administeredAt: item.administeredAt,
          doseNumber: item.doseNumber,
          batchNumber: item.batchNumber,
          manufacturer: item.manufacturer,
          administeredBy: item.administeredBy,
          facility: item.facility,
          route: item.route,
          site: item.site,
          adverseReaction: item.adverseReaction,
          adverseReactionNotes: item.adverseReactionNotes,
          nextDueDate: item.nextDueDate,
          status: item.status,
          notes: item.notes,
          source: clinical ? 'CLINICAL' : 'PATIENT',
          sourceLabel: clinical ? 'Clinical · view only' : 'Patient entered · editable',
          clinicalBy: item.administeredBy ?? null,
          updatedAt: item.updatedAt,
        };
      }),
      procedures: completedProcedures.map((item) => ({
        id: item.id,
        name: item.procedure.name,
        description: item.procedure.description,
        category: item.procedure.category,
        bodySystem: item.procedure.bodySystem,
        invasive: item.procedure.invasive,
        surgical: item.procedure.surgical,
        performedAt: item.performedAt,
        status: item.status,
        outcome: item.outcome,
        performer: item.performer,
        facility: item.facility,
        complications: item.complications,
        followUpRequired: item.followUpRequired,
        followUpDate: item.followUpDate,
        practitionerName: practitionerName(item),
        notes: item.notes,
        source: 'CLINICAL',
        sourceLabel: 'Clinical · view only',
        clinicalBy: practitionerName(item),
        updatedAt: item.updatedAt,
      })),
      lifestyle: {
        occupation: patient.occupation,
        dominantHand: patient.dominantHand,
        smokingStatus: patient.smokingStatus,
        alcoholConsumption: patient.alcoholConsumption,
        exerciseFrequency: patient.exerciseFrequency,
      },
      coverage: patient.patientInsurances.map((item) => ({
        id: item.id,
        providerName: item.insurancePolicy.provider.name,
        providerShortName: item.insurancePolicy.provider.shortName,
        providerPhone: item.insurancePolicy.provider.phone,
        providerEmail: item.insurancePolicy.provider.email,
        providerWebsite: item.insurancePolicy.provider.website,
        planCode: item.insurancePolicy.code,
        planName: item.insurancePolicy.name,
        planDescription: item.insurancePolicy.description,
        planStatus: item.insurancePolicy.status,
        membershipNumber: item.membershipNumber,
        dependantCode: item.dependantCode,
        principalMemberName: item.principalMemberName,
        relationship: item.relationship,
        effectiveFrom: item.effectiveFrom,
        effectiveTo: item.effectiveTo,
        annualLimit: item.insurancePolicy.annualLimit != null ? Number(item.insurancePolicy.annualLimit) : null,
        deductible: item.insurancePolicy.deductible != null ? Number(item.insurancePolicy.deductible) : null,
        coPayment: item.insurancePolicy.coPayment != null ? Number(item.insurancePolicy.coPayment) : null,
        active: item.active,
        updatedAt: item.updatedAt,
      })),
    };
  }
}
