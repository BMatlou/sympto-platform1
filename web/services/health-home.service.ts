import { api } from '@/lib/api';

export interface HealthHomeResponse {
  generatedAt: string;
  patient: { id: string; patientNumber?: string | null; name: string; firstName: string; lastName: string; profileImageUrl?: string | null };
  healthSnapshot: { activeConditions: Array<Record<string, unknown>>; allergies: Array<Record<string, unknown>>; bloodType?: string | null; weightKg?: number | string | null; heightCm?: number | string | null };
  today: { upcomingAppointments: Array<Record<string, unknown>>; activeMedications: Array<Record<string, unknown>> };
  goals: Array<Record<string, unknown>>;
  family: Array<Record<string, unknown>>;
  wearables: { devices: Array<Record<string, unknown>>; latestMeasurements: Array<{ id: string; type: string; value: number | string; unit: string; measuredAt: string; source?: string | null }> };
  attention: Array<{ type: string; severity: string; title: string; description: string }>;
  journal: { mode: 'automatic'; userInputRequired: false; sourceTypes: string[] };
}

class HealthHomeService {
  async getHealthHome(): Promise<HealthHomeResponse> {
    const response = await api.get<{ success: boolean; data: HealthHomeResponse }>('/health-home');
    return response.data.data;
  }
}

export const healthHomeService = new HealthHomeService();
