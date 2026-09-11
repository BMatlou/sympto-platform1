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
}

export const healthGoalsService = new HealthGoalsService();
