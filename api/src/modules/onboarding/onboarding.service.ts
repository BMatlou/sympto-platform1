import { Injectable } from '@nestjs/common';

import { OnboardingRepository } from './onboarding.repository';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
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
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  /**
   * Get onboarding progress
   */
  async getProgress(userId: string) {
  let progress =
    await this.onboardingRepository.findByUser(userId);

  if (!progress) {
    progress =
      await this.onboardingRepository.create(userId);
  }

  return progress;
}


  /**
   * Update onboarding progress
   */
  async updateProgress(
    userId: string,
    dto: UpdateProgressDto,
  ) {
    return this.onboardingRepository.update(userId, {
      currentStep: dto.currentStep,
      completionPercentage: dto.completionPercentage,
      status: dto.status,
      completedAt:
        dto.status === 'COMPLETED'
          ? new Date()
          : null,
    });
  }

  /**
 * STEP 1
 * Personal Profile
 */
async updateProfile(
  userId: string,
  dto: UpdateProfileDto,
) {
  // Save the personal profile first.
  await this.onboardingRepository.updatePersonProfile(
    userId,
    dto,
  );

  // Only advance onboarding after the profile
  // has been successfully persisted.
  return this.onboardingRepository.update(userId, {
    currentStep: 2,
    completionPercentage: 10,
    status: 'IN_PROGRESS',
  });
}

  /**
   * Step 2
   * Health Profile
   */
  async updateIndividualProfile(
    userId: string,
    dto: UpdateIndividualProfileDto,
  ) {
    return this.onboardingRepository.updateIndividualProfile(
      userId,
      dto,
    );
  }

  /**
   * Step 3
   * Emergency Contact
   */
  async updateEmergencyContact(
    userId: string,
    dto: UpdateEmergencyContactDto,
  ) {
    return this.onboardingRepository.saveEmergencyContact(
      userId,
      dto,
    );
  }

    /**
   * STEP 4
   * Patient Allergies
   */
  async updatePatientAllergies(
    userId: string,
    dto: UpdatePatientAllergiesDto,
  ) {
    return this.onboardingRepository.savePatientAllergies(
      userId,
      dto,
    );
  }

  /**
 * STEP 5
 * Patient Medical Conditions
 */
async updatePatientConditions(
  userId: string,
  dto: UpdatePatientConditionsDto,
) {
  return this.onboardingRepository.savePatientConditions(
    userId,
    dto,
  );
}

/**
 * STEP 6
 * Patient Medications
 */
async updatePatientMedications(
  userId: string,
  dto: UpdatePatientMedicationsDto,
) {
  return this.onboardingRepository.savePatientMedications(
    userId,
    dto,
  );
}

/**
 * STEP 7
 * Patient Immunizations
 */
async updatePatientImmunizations(
  userId: string,
  dto: UpdatePatientImmunizationsDto,
) {
  return this.onboardingRepository.savePatientImmunizations(
    userId,
    dto,
  );
}

  /**
   * STEP 8
   * Health Goals
   */
  async updateHealthGoals(
    userId: string,
    dto: UpdateHealthGoalsDto,
  ) {
    return this.onboardingRepository.saveHealthGoals(
      userId,
      dto,
    );
  }

    /**
   * STEP 9
   * Health Journal Settings
   */
  async updateHealthJournalSettings(
    userId: string,
    dto: UpdateHealthJournalSettingsDto,
  ) {
    return this.onboardingRepository.saveHealthJournalSettings(
      userId,
      dto,
    );
  }

  /**
 * STEP 10
 * Save onboarding consent
 */
async updateConsent(
  userId: string,
  dto: UpdateConsentDto,
) {
  return this.onboardingRepository.saveConsent(
    userId,
    dto,
  );
}

  /**
   * STEP 11
   * Complete onboarding
   */
    async completeOnboarding(
    userId: string,
  ) {
    return this.onboardingRepository.completeOnboarding(
      userId,
    );
  }

  async getDashboardData(userId: string) {
    return this.onboardingRepository.getDashboardData(
      userId,
    );
  }
}