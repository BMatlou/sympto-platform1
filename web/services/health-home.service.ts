import { api } from '@/lib/api';

export interface HealthHomeResponse {
  generatedAt: string;
  profile: {
    preferredName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    [key: string]: unknown;
  } | null;
  patient: Record<string, unknown> & {
    healthPassport?: Record<string, unknown> | null;
    healthJournalSettings?: Record<string, unknown> | null;
  };
  healthPassport: Record<string, unknown> | null;
  healthSnapshot: {
    baseline: Record<string, unknown> | null;
    latestMeasurements: Array<{
      type: string;
      value: number;
      unit: string;
      measuredAt: string;
      source?: string | null;
    }>;
    connectedDevices: Array<{
      id: string;
      manufacturer: string;
      model: string;
      deviceType: string;
      status: string;
      lastSyncAt: string | null;
      measurementCount: number;
    }>;
  };
  attention: Array<{
    type: string;
    priority: string;
    title: string;
    body: string;
    actionUrl?: string | null;
  }>;
  today: {
    notifications: unknown[];
    upcomingAppointments: unknown[];
    activeMedicationCount: number;
    activeGoalCount: number;
  };
  medications: unknown[];
  appointments: unknown[];
  goals: unknown[];
  healthGoals: unknown[];
  family: unknown[];
  allergies: unknown[];
  conditions: unknown[];
  immunizations: unknown[];
  emergencyContacts: unknown[];
  symptoms: unknown[];
  recentResults: {
    laboratory: unknown[];
    imaging: unknown[];
  };
  carePlans: unknown[];
  journal: {
    generatedAt: string;
    sourceCount: number;
    signals: Array<{
      type: string;
      value: number;
      unit: string;
      measuredAt: string;
      source?: string | null;
    }>;
    recentSymptoms: unknown[];
    medicationCount: number;
    upcomingAppointmentCount: number;
  };
  ai: {
    recentObservations: unknown[];
  };
  settings: Record<string, unknown> | null;
  healthJournalSettings: Record<string, unknown> | null;
}

export interface GeneratedJournal {
  id: string;
  title: string;
  journal: string;
  createdAt: string;
  updatedAt: string;
}

class HealthHomeService {
  async getHealthHome(): Promise<HealthHomeResponse> {
    const { data } = await api.get('/health-home');
    return data.data;
  }

  async generateDailyJournal(): Promise<GeneratedJournal> {
    const { data } = await api.post('/health-home/journal/generate');
    return data.data;
  }
}

export const healthHomeService = new HealthHomeService();
