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

    // The canonical date of birth is stored on the Person/profile record.
    // The profile page also reads the Patient record, so expose the same
    // value there without changing the underlying data model.
    if (patient && !patient.dateOfBirth && profile?.dateOfBirth) {
      return {
        ...data,
        patient: {
          ...patient,
          dateOfBirth: profile.dateOfBirth,
        },
      };
    }

    return data;
  }
}

export const healthPassportService = new HealthPassportService();
