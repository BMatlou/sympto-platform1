import { api } from '@/lib/api';

import type {
  OnboardingProgress,
  UpdateProfileDto,
  UpdateIndividualProfileDto,
  UpdateEmergencyContactDto,
  UpdatePatientAllergiesDto,
  UpdatePatientConditionsDto,
  UpdatePatientMedicationsDto,
  UpdatePatientImmunizationsDto,
  UpdateHealthGoalsDto,
  UpdateHealthJournalSettingsDto,
  UpdateConsentDto,
} from '@/types/onboarding';

class OnboardingService {
  async getProgress() {
  const { data } = await api.get(
    '/onboarding/progress',
  );

  return data.data;
}

 async createProgress() {
  const { data } = await api.post(
    '/onboarding/progress',
  );

  return data.data;
}

  async updateProgress(
    dto: OnboardingProgress,
  ) {
    const { data } = await api.patch(
      '/onboarding/progress',
      dto,
    );

    return data;
  }

  async updateProfile(
    dto: UpdateProfileDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/profile',
      dto,
    );

    return data;
  }

  async updateIndividualProfile(
    dto: UpdateIndividualProfileDto,
  ) {
    const exerciseFrequencyMap: Record<string, string> = {
      NONE: 'NONE',
      NEVER: 'NONE',
      RARELY: 'ONCE_PER_WEEK',
      '1_2_PER_WEEK': 'TWO_TO_THREE_PER_WEEK',
      '3_4_PER_WEEK': 'FOUR_TO_FIVE_PER_WEEK',
      '5_PLUS_PER_WEEK': 'DAILY',
      ONCE_PER_WEEK: 'ONCE_PER_WEEK',
      TWO_TO_THREE_PER_WEEK: 'TWO_TO_THREE_PER_WEEK',
      FOUR_TO_FIVE_PER_WEEK: 'FOUR_TO_FIVE_PER_WEEK',
      DAILY: 'DAILY',
    };

    const payload = {
      ...dto,
      exerciseFrequency: dto.exerciseFrequency
        ? exerciseFrequencyMap[dto.exerciseFrequency] ?? dto.exerciseFrequency
        : dto.exerciseFrequency,
    };

    const { data } = await api.patch(
      '/onboarding/individual/profile',
      payload,
    );

    return data;
  }

  async updateEmergencyContact(
    dto: UpdateEmergencyContactDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/emergency-contact',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * ALLERGIES
   * --------------------------------------------------------------------------
   */

  async updatePatientAllergies(
    dto: UpdatePatientAllergiesDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/allergies',
      dto,
    );

    return data;
  }

  async searchAllergies(search: string) {
    const { data } = await api.get(
      '/allergies',
      {
        params: {
          search,
          limit: 10,
          page: 1,
        },
      },
    );

    return data.data.data;
  }

  async getAllergy(id: string) {
    const { data } = await api.get(
      `/allergies/${id}`,
    );

    return data.data;
  }

  /*
   * --------------------------------------------------------------------------
   * CONDITIONS
   * --------------------------------------------------------------------------
   */

  async searchConditions(search: string) {
    const { data } = await api.get(
      '/conditions',
      {
        params: {
          search,
          limit: 10,
          page: 1,
        },
      },
    );

    return data.data.data;
  }

  async getCondition(id: string) {
    const { data } = await api.get(
      `/conditions/${id}`,
    );

    return data.data;
  }

  async updatePatientConditions(
    dto: UpdatePatientConditionsDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/conditions',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * MEDICATIONS
   * --------------------------------------------------------------------------
   */

  async updatePatientMedications(
    dto: UpdatePatientMedicationsDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/medications',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * IMMUNIZATIONS
   * --------------------------------------------------------------------------
   */

  async getImmunizations() {
  const { data } = await api.get('/immunizations', {
    params: {
      page: 1,
      limit: 50,
    },
  });

  return data.data.data;
}

  async updatePatientImmunizations(
    dto: UpdatePatientImmunizationsDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/immunizations',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * HEALTH GOALS
   * --------------------------------------------------------------------------
   */

  async updateHealthGoals(
    dto: UpdateHealthGoalsDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/health-goals',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * HEALTH JOURNAL
   * --------------------------------------------------------------------------
   */

  async updateHealthJournalSettings(
    dto: UpdateHealthJournalSettingsDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/journal-settings',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * CONSENT
   * --------------------------------------------------------------------------
   */

  async updateConsent(
    dto: UpdateConsentDto,
  ) {
    const { data } = await api.patch(
      '/onboarding/individual/consent',
      dto,
    );

    return data;
  }

  /*
   * --------------------------------------------------------------------------
   * COMPLETE ONBOARDING
   * --------------------------------------------------------------------------
   */

    async complete() {
    const { data } = await api.post(
      '/onboarding/complete',
    );

    return data;
  }

  async getDashboardData() {
    const { data } = await api.get(
      '/onboarding/dashboard',
    );

    return data;
  }
}

export const onboardingService =
  new OnboardingService();
