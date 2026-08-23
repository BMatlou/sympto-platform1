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

    return response.data.data;
  }
}

export const healthPassportService = new HealthPassportService();
