import { api } from '@/lib/api';

export interface HealthHomeResponse {
  generatedAt: string;
  profile?: { firstName?: string | null; lastName?: string | null; preferredName?: string | null } | null;
  patient: { id: string; patientNumber?: string | null; name?: string; firstName?: string; lastName?: string; profileImageUrl?: string | null };
  healthPassport?: Record<string, unknown> | null;
  healthSnapshot: {
    activeConditions: Array<Record<string, unknown>>;
    allergies: Array<Record<string, unknown>>;
    immunizations: Array<Record<string, unknown>>;
    bloodType?: string | null;
    rhesusFactor?: string | null;
    baseline?: Record<string, unknown> | null;
    weightKg?: number | null;
    heightCm?: number | null;
    bmi?: number | null;
    bmiCategory?: string | null;
    latestMeasurements: Array<Record<string, unknown>>;
    connectedDevices: Array<Record<string, unknown>>;
  };
  today: {
    upcomingAppointments: Array<Record<string, unknown>>;
    activeMedications: Array<Record<string, unknown>>;
    activeMedicationCount?: number;
    activeGoalCount?: number;
  };
  medications?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  healthGoals?: Array<Record<string, unknown>>;
  family: Array<Record<string, unknown>>;
  allergies?: Array<Record<string, unknown>>;
  conditions?: Array<Record<string, unknown>>;
  immunizations?: Array<Record<string, unknown>>;
  emergencyContacts?: Array<Record<string, unknown>>;
  wearables: {
    devices: Array<Record<string, unknown>>;
    latestMeasurements: Array<{ id: string; type: string; value: number | string; unit: string; measuredAt: string; source?: string | null }>;
  };
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    channel: string;
    status: string;
    priority: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    scheduledFor?: string | null;
    createdAt: string;
  }>;
  medicationNotifications?: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    channel: string;
    status: string;
    priority: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    scheduledFor?: string | null;
    createdAt: string;
  }>;
  attention: Array<{ type: string; severity: string; title: string; description: string; actionUrl?: string | null; actionLabel?: string | null }>;
  journal: Record<string, unknown>;
  healthJournalSettings?: Record<string, unknown> | null;
}

export interface UpdateWeightResponse {
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: string | null;
  recordedAt: string;
  goals: Array<{ id: string; progressPercent: number; currentValue: number; status: string }>;
}

class HealthHomeService {
  async getHealthHome(patientId?: string): Promise<HealthHomeResponse> {
    const response = await api.get<{ success: boolean; data: HealthHomeResponse }>('/health-home', {
      params: patientId ? { patientId } : undefined,
    });
    const data = response.data.data;
    return {
      ...data,
      wearables: data.wearables ?? {
        devices: data.healthSnapshot.connectedDevices,
        latestMeasurements: data.healthSnapshot.latestMeasurements.map((m: any, index) => ({
          id: `${m.type}-${index}`,
          type: m.type,
          value: m.value,
          unit: m.unit,
          measuredAt: m.measuredAt,
          source: m.source,
        })),
      },
    };
  }

  async updateWeight(weightKg: number, heightCm?: number, patientId?: string): Promise<UpdateWeightResponse> {
    const response = await api.post<{ success: boolean; data: UpdateWeightResponse }>('/health-home/weight', {
      weightKg,
      ...(heightCm !== undefined ? { heightCm } : {}),
    }, {
      params: patientId ? { patientId } : undefined,
    });
    return response.data.data;
  }
}

export const healthHomeService = new HealthHomeService();
