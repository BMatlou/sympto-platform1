import { api } from '@/lib/api';

export interface HealthPassportDashboardData {
  profile: Record<string, unknown> | null;
  patient: Record<string, unknown> | null;
  healthPassport: Record<string, unknown> | null;
  emergencyContacts: Array<Record<string, unknown>>;
  allergies: Array<Record<string, unknown>>;
  conditions: Array<Record<string, unknown>>;
  medications: Array<Record<string, unknown>>;
  immunizations: Array<Record<string, unknown>>;
  healthGoals: Array<Record<string, unknown>>;
  healthJournalSettings: Record<string, unknown> | null;
}

class HealthPassportService {
  async getHealthPassport(): Promise<HealthPassportDashboardData> {
    const response = await api.get<{
      success: boolean;
      data: HealthPassportDashboardData;
    }>('/onboarding/dashboard');

    const data = response.data.data;
    const profile = data.profile;
    const patient = data.patient;

    // Person is the canonical source for profile-level identity data such as
    // date of birth and gender. Mirror those persisted values onto the patient
    // object returned to profile consumers so the Health Profile card uses the
    // same source of truth as onboarding without changing database ownership.
    if (patient) {
      const mirroredPatient = {
        ...patient,
        ...(profile?.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
        ...(profile?.gender ? { gender: profile.gender } : {}),
      };

      return {
        ...data,
        patient: mirroredPatient,
      };
    }

    return data;
  }
}

export const healthPassportService = new HealthPassportService();
