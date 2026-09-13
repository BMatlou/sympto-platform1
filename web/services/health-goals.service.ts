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

export type HealthGoalInput = {
  patientId: string;
  practitionerId?: string;
  carePlanId?: string;
  title: string;
  description?: string;
  category: string;
  priority?: string;
  status?: string;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  targetDate?: string;
  metricType?: string;
  metricKey?: string;
  frequency?: "DAILY" | "WEEKLY" | "TOTAL";
  frequencyTarget?: string;
  aggregation?: "SUM" | "LATEST" | "AVERAGE" | "MIN" | "MAX";
  comparison?: "AT_LEAST" | "AT_MOST" | "CLOSEST" | "INCREASE_TO" | "DECREASE_TO";
  guidanceText?: string;
};

export type HealthGoalListResponse = {
  data: any[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

class HealthGoalsService {
  async list(patientId: string): Promise<HealthGoalListResponse> {
    const response = await api.get("/health-goals", {
      params: { patientId, page: 1, limit: 100 },
    });
    return response.data?.data ?? response.data;
  }

  async create(input: HealthGoalInput) {
    const response = await api.post("/patient-health-goals", input);
    return response.data?.data ?? response.data;
  }

  async update(id: string, input: Partial<HealthGoalInput>) {
    const response = await api.patch(`/patient-health-goals/${id}`, input);
    return response.data?.data ?? response.data;
  }

  async configureMetric(
    id: string,
    config: Pick<HealthGoalInput, "metricType" | "metricKey" | "frequency" | "frequencyTarget" | "aggregation" | "comparison" | "guidanceText">,
  ) {
    const response = await api.patch(`/patient-health-goals/${id}/metric-config`, config);
    return response.data?.data ?? response.data;
  }

  async remove(id: string) {
    const response = await api.delete(`/patient-health-goals/${id}`);
    return response.data?.data ?? response.data;
  }

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
