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

  async getProgress(userId: string) {
    let progress = await this.onboardingRepository.findByUser(userId);
    if (!progress) progress = await this.onboardingRepository.create(userId);
    return progress;
  }

  async updateProgress(userId: string, dto: UpdateProgressDto) {
    return this.onboardingRepository.update(userId, {
      currentStep: dto.currentStep,
      completionPercentage: dto.completionPercentage,
      status: dto.status,
      completedAt: dto.status === 'COMPLETED' ? new Date() : null,
    });
  }

  /**
   * STEP 1 / personal profile.
   * A profile-picture-only update must not reset or advance onboarding progress.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const isProfileImageOnly =
      dto.profileImageUrl !== undefined &&
      dto.preferredName === undefined &&
      dto.dateOfBirth === undefined &&
      dto.gender === undefined;

    const profile = await this.onboardingRepository.updatePersonProfile(userId, dto);

    if (isProfileImageOnly) {
      return profile;
    }

    return this.onboardingRepository.update(userId, {
      currentStep: 2,
      completionPercentage: 10,
      status: 'IN_PROGRESS',
    });
  }

  async updateIndividualProfile(userId: string, dto: UpdateIndividualProfileDto) {
    return this.onboardingRepository.updateIndividualProfile(userId, dto);
  }

  async updateEmergencyContact(userId: string, dto: UpdateEmergencyContactDto) {
    return this.onboardingRepository.saveEmergencyContact(userId, dto);
  }

  async updatePatientAllergies(userId: string, dto: UpdatePatientAllergiesDto) {
    return this.onboardingRepository.savePatientAllergies(userId, dto);
  }

  async updatePatientConditions(userId: string, dto: UpdatePatientConditionsDto) {
    return this.onboardingRepository.savePatientConditions(userId, dto);
  }

  async updatePatientMedications(userId: string, dto: UpdatePatientMedicationsDto) {
    return this.onboardingRepository.savePatientMedications(userId, dto);
  }

  async updatePatientImmunizations(userId: string, dto: UpdatePatientImmunizationsDto) {
    return this.onboardingRepository.savePatientImmunizations(userId, dto);
  }

  async updateHealthGoals(userId: string, dto: UpdateHealthGoalsDto) {
    return this.onboardingRepository.saveHealthGoals(userId, dto);
  }

  async updateHealthJournalSettings(userId: string, dto: UpdateHealthJournalSettingsDto) {
    return this.onboardingRepository.saveHealthJournalSettings(userId, dto);
  }

  async updateConsent(userId: string, dto: UpdateConsentDto) {
    return this.onboardingRepository.saveConsent(userId, dto);
  }

  async completeOnboarding(userId: string) {
    return this.onboardingRepository.completeOnboarding(userId);
  }

  async getDashboardData(userId: string) {
    return this.onboardingRepository.getDashboardData(userId);
  }
}
