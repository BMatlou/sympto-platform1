import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  AllergyStatus,
  ConditionStatus,
  MedicationStatus,
  OnboardingStatus,
} from '@prisma/client';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateIndividualProfileDto } from './dto/update-individual-profile.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { UpdatePatientAllergiesDto } from './dto/update-patient-allergies.dto';
import { UpdatePatientConditionsDto } from './dto/update-patient-conditions.dto';
import { UpdatePatientMedicationsDto } from './dto/update-patient-medications.dto';
import { UpdatePatientImmunizationsDto } from './dto/update-patient-immunizations.dto';
import { UpdateHealthGoalsDto } from './dto/update-health-goals.dto';
import { UpdateHealthJournalSettingsDto } from './dto/update-health-journal-settings.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';


@Injectable()
export class OnboardingRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Update onboarding progress.
   */
  private async updateOnboardingStep(
    tx: Prisma.TransactionClient,
    userId: string,
    currentStep: number,
    completionPercentage: number,
  ) {
    return tx.onboardingProgress.update({
      where: {
        userId,
      },
      data: {
        currentStep,
        completionPercentage,
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Fetch patient together with Health Passport.
   */
  private async getPatientWithPassport(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    const patient = await tx.patient.findUnique({
      where: {
        userId,
      },
      include: {
        healthPassport: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    if (!patient.healthPassport) {
      throw new NotFoundException(
        'Health Passport not found.',
      );
    }

    return patient;
  }

  async findByUser(userId: string) {
    return this.prisma.onboardingProgress.findUnique({
      where: {
        userId,
      },
    });
  }

  async create(userId: string) {
    return this.prisma.onboardingProgress.create({
      data: {
        userId,
      },
    });
  }

  async update(
    userId: string,
    data: Prisma.OnboardingProgressUpdateInput,
  ) {
    return this.prisma.onboardingProgress.update({
      where: {
        userId,
      },
      data,
    });
  }

  /**
   * STEP 1
   * Personal Profile
   */
  async updatePersonProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        person: {
          update: {
            preferredName: dto.preferredName,
            dateOfBirth: dto.dateOfBirth
              ? new Date(dto.dateOfBirth)
              : undefined,
            gender: dto.gender,
          },
        },
      },
      include: {
        person: true,
      },
    });
  }

  /**
   * STEP 2
   * Health Profile
   */
  async updateIndividualProfile(
    userId: string,
    dto: UpdateIndividualProfileDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: {
          userId,
        },
      });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }

      await tx.patient.update({
        where: {
          id: patient.id,
        },
        data: {
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          occupation: dto.occupation,
          dominantHand: dto.dominantHand,
          smokingStatus: dto.smokingStatus,
          alcoholConsumption:
            dto.alcoholConsumption,
          exerciseFrequency:
            dto.exerciseFrequency,
        },
      });

      await tx.healthPassport.upsert({
        where: {
          patientId: patient.id,
        },
        update: {
          bloodType: dto.bloodType,
          rhesusFactor: dto.rhesusFactor,
          organDonor: dto.organDonor ?? false,
          emergencyNotes: dto.emergencyNotes,
          shareByDefault:
            dto.shareByDefault ?? false,
        },
        create: {
          patientId: patient.id,
          bloodType: dto.bloodType,
          rhesusFactor: dto.rhesusFactor,
          organDonor: dto.organDonor ?? false,
          emergencyNotes: dto.emergencyNotes,
          shareByDefault:
            dto.shareByDefault ?? false,
        },
      });

      return this.updateOnboardingStep(tx, userId, 3, 20);
    });
  }

    /**
   * STEP 3
   * Emergency Contact
   */
  async saveEmergencyContact(
    userId: string,
    dto: UpdateEmergencyContactDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: {
          userId,
        },
      });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }

      const existingPrimary =
        await tx.emergencyContact.findFirst({
          where: {
            patientId: patient.id,
            isPrimary: true,
          },
        });

      if (existingPrimary) {
        await tx.emergencyContact.update({
          where: {
            id: existingPrimary.id,
          },
          data: {
            fullName: dto.fullName,
            relationship: dto.relationship,
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            isPrimary: dto.isPrimary ?? true,
          },
        });
      } else {
        await tx.emergencyContact.create({
          data: {
            patientId: patient.id,
            fullName: dto.fullName,
            relationship: dto.relationship,
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            isPrimary: dto.isPrimary ?? true,
          },
        });
      }

      return this.updateOnboardingStep(tx, userId, 4, 30);
    });
  }

  /**
   * STEP 4
   * Patient Allergies
   */
  async savePatientAllergies(
    userId: string,
    dto: UpdatePatientAllergiesDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient =
        await this.getPatientWithPassport(
          tx,
          userId,
        );

      const healthPassportId =
        patient.healthPassport!.id;

      await tx.patientAllergy.deleteMany({
        where: {
          healthPassportId,
        },
      });

      for (const allergy of dto.allergies) {
        await tx.patientAllergy.create({
          data: {
  healthPassportId,

  allergyId: allergy.allergyId,

  severity: allergy.severity,

  reaction: allergy.reaction,

  reactionNotes: allergy.reactionNotes,

  onsetDate: allergy.onsetDate
    ? new Date(allergy.onsetDate)
    : undefined,

  lastReaction: allergy.lastReaction
    ? new Date(allergy.lastReaction)
    : undefined,

  verified: allergy.verified ?? false,

  verifiedBy: allergy.verifiedBy,

  status:
    allergy.status ??
    AllergyStatus.ACTIVE,

  notes: allergy.notes,
},
        });
      }

      return this.updateOnboardingStep(tx, userId, 5, 40);
    });
  }

    /**
   * STEP 5
   * Patient Conditions
   */
  async savePatientConditions(
    userId: string,
    dto: UpdatePatientConditionsDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient =
        await this.getPatientWithPassport(
          tx,
          userId,
        );

      const healthPassportId =
        patient.healthPassport!.id;

      await tx.patientCondition.deleteMany({
        where: {
          healthPassportId,
        },
      });

      for (const condition of dto.conditions) {
        await tx.patientCondition.create({
          data: {
  healthPassportId,

  conditionId: condition.conditionId,

  diagnosedAt: condition.diagnosedAt
    ? new Date(condition.diagnosedAt)
    : undefined,

  resolvedAt: condition.resolvedAt
    ? new Date(condition.resolvedAt)
    : undefined,

  status:
    condition.status ??
    ConditionStatus.ACTIVE,

  severity: condition.severity,

  stage: condition.stage,

  chronic:
    condition.chronic ?? false,

  primaryCondition:
    condition.primaryCondition ?? false,

  diagnosedBy:
    condition.diagnosedBy,

  treatmentPlan:
    condition.treatmentPlan,

  outcome:
    condition.outcome,

  notes:
    condition.notes,
},
        });
      }

      return this.updateOnboardingStep(tx, userId, 6, 50);
    });
  }

  /**
   * STEP 6
   * Patient Medications
   */
  async savePatientMedications(
    userId: string,
    dto: UpdatePatientMedicationsDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient =
        await this.getPatientWithPassport(
          tx,
          userId,
        );

      const healthPassportId =
        patient.healthPassport!.id;

      await tx.patientMedication.deleteMany({
        where: {
          healthPassportId,
        },
      });

      for (const medication of dto.medications) {
        await tx.patientMedication.create({
          data: {
  healthPassportId,

  medicationId:
    medication.medicationId,

  dosage:
    medication.dosage,

  frequency:
    medication.frequency,

  route:
    medication.route,

  indication:
    medication.indication,

  instructions:
    medication.instructions,

  prescribedBy:
    medication.prescribedBy,

  startedAt:
    medication.startedAt
      ? new Date(
          medication.startedAt,
        )
      : undefined,

  endedAt:
    medication.endedAt
      ? new Date(
          medication.endedAt,
        )
      : undefined,

  ongoing:
    medication.ongoing ?? false,

  adherencePercentage:
    medication.adherencePercentage,

  missedDoses:
    medication.missedDoses,

  sideEffects:
    medication.sideEffects,

  effectiveness:
    medication.effectiveness,

  status:
    medication.status ??
    MedicationStatus.ACTIVE,

  notes:
    medication.notes,
},
        });
      }

      return this.updateOnboardingStep(tx, userId, 7, 60);
    });
  }

    /**
   /**
 * STEP 7
 * Patient Immunizations
 */
async savePatientImmunizations(
  userId: string,
  dto: UpdatePatientImmunizationsDto,
) {
  return this.prisma.$transaction(async (tx) => {
    const patient =
      await this.getPatientWithPassport(
        tx,
        userId,
      );

    const healthPassportId =
      patient.healthPassport!.id;

    /**
     * Replace immunization list.
     */
    await tx.patientImmunization.deleteMany({
      where: {
        healthPassportId,
      },
    });

    /**
     * Save immunizations.
     */
    for (const immunization of dto.immunizations) {
      await tx.patientImmunization.create({
        data: {
          healthPassportId,

          immunizationId:
            immunization.immunizationId,

          administeredAt:
            immunization.administeredAt
              ? new Date(
                  immunization.administeredAt,
                )
              : undefined,

          doseNumber:
            immunization.doseNumber,

          batchNumber:
            immunization.batchNumber,

          manufacturer:
            immunization.manufacturer,

          administeredBy:
            immunization.administeredBy,

          facility:
            immunization.facility,

          route:
            immunization.route,

          site:
            immunization.site,

          adverseReaction:
            immunization.adverseReaction ??
            false,

          adverseReactionNotes:
            immunization.adverseReactionNotes,

          nextDueDate:
            immunization.nextDueDate
              ? new Date(
                  immunization.nextDueDate,
                )
              : undefined,

          notes:
            immunization.notes,
        },
      });
    }

    return this.updateOnboardingStep(tx, userId, 8, 70);
  });
}

    /**
   * STEP 8
   * Health Goals
   */
  async saveHealthGoals(
    userId: string,
    dto: UpdateHealthGoalsDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: {
          userId,
        },
      });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }

      /**
       * Replace existing goals.
       */
      await tx.healthGoal.deleteMany({
        where: {
          patientId: patient.id,
        },
      });

      /**
       * Save selected goals.
       */
      for (const goal of dto.goals) {
        await tx.healthGoal.create({
  data: {
    patientId: patient.id,

    title: goal.title,
    description: goal.description,

    category: goal.category,

    priority: goal.priority ?? 'MEDIUM',

    status: goal.status ?? 'ACTIVE',

    targetValue: goal.targetValue,

    currentValue: goal.currentValue,

    unit: goal.unit,

    targetDate: goal.targetDate
      ? new Date(goal.targetDate)
      : undefined,

    achievedAt: goal.achievedAt
      ? new Date(goal.achievedAt)
      : undefined,
  },
});
      }

      return this.updateOnboardingStep(tx, userId, 9, 80);
    });
  }

    /**
   * STEP 9
   * Health Journal Settings
   */
  async saveHealthJournalSettings(
    userId: string,
    dto: UpdateHealthJournalSettingsDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: {
          userId,
        },
      });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }

      await tx.healthJournalSettings.upsert({
        where: {
          patientId: patient.id,
        },
        update: {
          trackSymptoms: dto.trackSymptoms,
          trackMood: dto.trackMood,
          trackSleep: dto.trackSleep,
          trackWater: dto.trackWater,
          trackNutrition: dto.trackNutrition,
          trackExercise: dto.trackExercise,
          trackMedications: dto.trackMedications,
          trackVitals: dto.trackVitals,

          remindersEnabled:
            dto.remindersEnabled,

          morningReminder:
            dto.morningReminder,

          afternoonReminder:
            dto.afternoonReminder,

          eveningReminder:
            dto.eveningReminder,

          weeklySummary:
            dto.weeklySummary,

          monthlySummary:
            dto.monthlySummary,
        },

        create: {
          patientId: patient.id,

          trackSymptoms:
            dto.trackSymptoms ?? true,

          trackMood:
            dto.trackMood ?? true,

          trackSleep:
            dto.trackSleep ?? true,

          trackWater:
            dto.trackWater ?? false,

          trackNutrition:
            dto.trackNutrition ?? false,

          trackExercise:
            dto.trackExercise ?? false,

          trackMedications:
            dto.trackMedications ?? true,

          trackVitals:
            dto.trackVitals ?? false,

          remindersEnabled:
            dto.remindersEnabled ?? true,

          morningReminder:
            dto.morningReminder,

          afternoonReminder:
            dto.afternoonReminder,

          eveningReminder:
            dto.eveningReminder,

          weeklySummary:
            dto.weeklySummary ?? true,

          monthlySummary:
            dto.monthlySummary ?? true,
        },
      });

      return this.updateOnboardingStep(tx, userId, 10, 90);
    });
  }

 /**
 * STEP 10
 * Save onboarding consent
 */
async saveConsent(
  userId: string,
  dto: UpdateConsentDto,
) {
  return this.prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: {
        userId,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    /**
     * Remove previous onboarding consent.
     */
    await tx.consent.deleteMany({
      where: {
        patientId: patient.id,
        type: {
          in: [
            'TERMS_AND_CONDITIONS',
            'PRIVACY_POLICY',
            'DATA_PROCESSING',
            'MARKETING',
          ],
        },
      },
    });

    /**
     * Terms & Conditions
     */
    await tx.consent.create({
      data: {
        patientId: patient.id,
        type: 'TERMS_AND_CONDITIONS',
        purpose: 'Application Terms and Conditions',
        granted: dto.acceptTerms,
      },
    });

    /**
     * Privacy Policy
     */
    await tx.consent.create({
      data: {
        patientId: patient.id,
        type: 'PRIVACY_POLICY',
        purpose: 'Privacy Policy',
        granted: dto.acceptPrivacyPolicy,
      },
    });

    /**
     * Data Processing
     */
    await tx.consent.create({
      data: {
        patientId: patient.id,
        type: 'DATA_PROCESSING',
        purpose: 'Personal Data Processing',
        granted: dto.acceptDataProcessing,
      },
    });

    /**
     * Marketing
     */
    await tx.consent.create({
      data: {
        patientId: patient.id,
        type: 'MARKETING',
        purpose: 'Marketing Communications',
        granted: dto.acceptMarketing ?? false,
      },
    });

    return this.updateOnboardingStep(tx, userId, 11, 95);
  });
}
  /**
   * STEP 11
   * Complete onboarding
   */
  async completeOnboarding(
    userId: string,
  ) {
    return this.prisma.onboardingProgress.update({
      where: {
        userId,
      },
      data: {
        currentStep: 11,
        completionPercentage: 100,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }


    /**
   * Get all health information needed by the dashboard.
   */
  async getDashboardData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        person: true,
        patient: {
          include: {
            healthPassport: true,
            healthGoals: true,
            healthJournalSettings: true,
            emergencyContacts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    const patientId = user.patient?.id;
    const healthPassportId =
      user.patient?.healthPassport?.id;

    if (!patientId || !healthPassportId) {
      throw new NotFoundException(
        'Patient health information not found.',
      );
    }

    const [
      allergies,
      conditions,
      medications,
      immunizations,
    ] = await Promise.all([
      this.prisma.patientAllergy.findMany({
        where: {
          healthPassportId,
        },
        include: {
          allergy: true,
        },
      }),

      this.prisma.patientCondition.findMany({
        where: {
          healthPassportId,
        },
        include: {
          condition: true,
        },
      }),

      this.prisma.patientMedication.findMany({
        where: {
          healthPassportId,
        },
        include: {
          medication: true,
        },
      }),

      this.prisma.patientImmunization.findMany({
        where: {
          healthPassportId,
        },
        include: {
          immunization: true,
        },
      }),
    ]);

        const patient = user.patient;

    if (!patient) {
      throw new NotFoundException(
        'Patient health information not found.',
      );
    }

    return {
      profile: user.person,
      patient,
      healthPassport:
        patient.healthPassport,

      emergencyContacts:
        patient.emergencyContacts,

      allergies,
      conditions,
      medications,
      immunizations,

      healthGoals:
        patient.healthGoals,

      healthJournalSettings:
        patient.healthJournalSettings,
    };
}
}
