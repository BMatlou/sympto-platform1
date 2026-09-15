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
  patientMedicationId?: string;
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

const medicationIdFromCurrentUrl = () => {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get("open") !== "medication") return undefined;
  return params.get("patientMedicationId")?.trim() || params.get("associatedMedicationId")?.trim() || params.get("medicationId")?.trim() || undefined;
};

const normalizeGoalInput = (input: HealthGoalInput | Partial<HealthGoalInput>) => {
  const category = String(input.category ?? "").toUpperCase();
  const medicationIdentity = input.patientMedicationId || medicationIdFromCurrentUrl();
  const withMedicationIdentity = category === "MEDICATION" && medicationIdentity
    ? { ...input, patientMedicationId: medicationIdentity }
    : input;

  if (category === "SMOKING") {
    return { ...withMedicationIdentity, metricType: "SMOKING", metricKey: "smoking.cigarettes", frequency: "DAILY" as const, aggregation: "LATEST" as const, comparison: "AT_MOST" as const, unit: input.unit || "cigarettes/day" };
  }
  if (category === "ALCOHOL") {
    return { ...withMedicationIdentity, metricType: "ALCOHOL", metricKey: "alcohol.drinks", frequency: "WEEKLY" as const, aggregation: "SUM" as const, comparison: "AT_MOST" as const, unit: input.unit || "drinks/week" };
  }
  if (category === "EXERCISE") {
    return { ...withMedicationIdentity, metricType: "EXERCISE", metricKey: "exercise.minutes", frequency: "WEEKLY" as const, aggregation: "SUM" as const, comparison: "AT_LEAST" as const, unit: input.unit || "mins/week" };
  }
  return withMedicationIdentity;
};

class HealthGoalsService {
  async list(patientId: string): Promise<HealthGoalListResponse> {
    const response = await api.get("/health-goals", { params: { patientId, page: 1, limit: 100 } });
    return response.data?.data ?? response.data;
  }

  async create(input: HealthGoalInput) {
    const response = await api.post("/patient-health-goals", normalizeGoalInput(input));
    return response.data?.data ?? response.data;
  }

  async update(id: string, input: Partial<HealthGoalInput>) {
    const response = await api.patch(`/patient-health-goals/${id}`, normalizeGoalInput(input));
    return response.data?.data ?? response.data;
  }

  async configureMetric(id: string, config: Pick<HealthGoalInput, "metricType" | "metricKey" | "frequency" | "frequencyTarget" | "aggregation" | "comparison" | "guidanceText">) {
    const metricType = String((config as any).metricType ?? "").toUpperCase();
    const normalized = metricType === "SMOKING"
      ? { ...config, metricType: "SMOKING", metricKey: "smoking.cigarettes", frequency: "DAILY" as const, aggregation: "LATEST" as const, comparison: "AT_MOST" as const }
      : metricType === "ALCOHOL"
        ? { ...config, metricType: "ALCOHOL", metricKey: "alcohol.drinks", frequency: "WEEKLY" as const, aggregation: "SUM" as const, comparison: "AT_MOST" as const }
        : metricType === "EXERCISE"
          ? { ...config, metricType: "EXERCISE", metricKey: "exercise.minutes", frequency: "WEEKLY" as const, aggregation: "SUM" as const, comparison: "AT_LEAST" as const }
          : config;
    const response = await api.patch(`/patient-health-goals/${id}/metric-config`, normalized);
    return response.data?.data ?? response.data;
  }

  async syncMetricEvent(input: { metricType: string; metricKey: string; loggedValue: number; occurredAt?: string; source?: string; sourceId?: string }) {
    const response = await api.post("/health-goals/metric-event", input);
    return response.data?.data ?? response.data;
  }

  async logSmoking(id: string, cigarettes: number, dayKey: string) {
    const response = await api.post(`/patient-health-goals/${id}/smoking-log`, { cigarettes, dayKey });
    return response.data?.data ?? response.data;
  }

  async logAlcohol(id: string, currentWeekTotal: number, drinks: number) {
    const nextTotal = Math.max(0, Number(currentWeekTotal) + Number(drinks));
    const response = await api.patch(`/patient-health-goals/${id}`, { currentValue: String(nextTotal) });
    return response.data?.data ?? response.data;
  }

  async remove(id: string) {
    const response = await api.delete(`/patient-health-goals/${id}`);
    return response.data?.data ?? response.data;
  }

  async recordProgress(goalId: string, currentValue: number, notes?: string): Promise<HealthGoalProgressUpdate> {
    const { data } = await api.post(`/health-goals/${goalId}/progress`, { currentValue: String(currentValue), ...(notes ? { notes } : {}) });
    return data.data ?? data;
  }

  async getMetricEvents(metricType: string, metricKey: string, from: Date, to: Date, source?: string): Promise<HealthGoalMetricEventsResponse> {
    const response = await api.get(`/health-goals/metric-events`, { params: { metricType, metricKey, from: from.toISOString(), to: to.toISOString(), ...(source ? { source } : {}) } });
    return response.data?.data ?? response.data;
  }
}

export const healthGoalsService = new HealthGoalsService();
