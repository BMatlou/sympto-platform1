import { api } from '@/lib/api';

export interface HealthGoalSnapshot {
  id: string;
  title: string;
  category: string;
  metricType: string;
  metricKey: string;
  frequency: 'DAILY' | 'WEEKLY' | 'TOTAL';
  frequencyTarget: number | null;
  currentProgress: number;
  targetValue: number;
  currentValue: number;
  targetDate: string | null;
  guidanceText: string;
  unit: string | null;
  status: string;
}

class HealthGoalsService {
  async getActiveSnapshot(): Promise<HealthGoalSnapshot[]> {
    const response = await api.get<{ data: HealthGoalSnapshot[] }>('/health-goals/active-snapshot');
    return response.data.data ?? [];
  }

  async logMetric(input: {
    metricType: string;
    metricKey: string;
    loggedValue: number;
    metadata?: Record<string, unknown>;
  }) {
    const response = await api.post('/health-goals/metric-event', {
      ...input,
      source: 'health-goals-ui',
    });
    return response.data.data;
  }
}

export const healthGoalsService = new HealthGoalsService();
