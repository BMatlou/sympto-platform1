import { api } from "@/lib/api";

export type HealthGoalProgressUpdate = {
  id: string;
  title: string;
  category?: string;
  targetValue?: number | string | null;
  currentValue?: number | string | null;
  unit?: string | null;
  progress?: Array<{
    currentValue?: number | string | null;
    progressPercent?: number | string | null;
    status?: string | null;
    measuredAt?: string;
  }>;
};

export type HealthGoalMetricEventsResponse = {
  count: number;
  events: Array<{
    id: string;
    loggedValue: number;
    occurredAt: string;
    source: string;
    sourceId?: string | null;
  }>;
};

class HealthGoalsService {
  async recordProgress(
    goalId: string,
    currentValue: number,
    notes?: string,
  ): Promise<HealthGoalProgressUpdate> {
    const { data } = await api.post(
      `/health-goals/${goalId}/progress`,
      {
        currentValue: String(currentValue),
        ...(notes ? { notes } : {}),
      },
    );

    return data.data ?? data;
  }

  async getMetricEvents(
    metricType: string,
    metricKey: string,
    from: Date,
    to: Date,
    source?: string,
  ): Promise<HealthGoalMetricEventsResponse> {
    const response = await api.get(`/health-goals/metric-events`, {
      params: {
        metricType,
        metricKey,
        from: from.toISOString(),
        to: to.toISOString(),
        ...(source ? { source } : {}),
      },
    });
    return response.data?.data ?? response.data;
  }
}

export const healthGoalsService = new HealthGoalsService();
