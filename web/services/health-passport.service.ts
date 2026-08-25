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
    // date of birth and gender. Some profile consumers read those values from
    // the patient object, so expose the same persisted values there without
    // changing the database model or duplicating ownership of the fields.
    if (patient) {
      const mirroredPatient = {
        ...patient,
        ...(patient.dateOfBirth ? {} : profile?.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
        ...(patient.gender ? {} : profile?.gender ? { gender: profile.gender } : {}),
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
