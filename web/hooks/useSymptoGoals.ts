"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type GoalMetricType =
  | "MEDICATION"
  | "EXERCISE"
  | "HYDRATION"
  | "SMOKING_CESSATION"
  | string;

export type GoalFrequency = "DAILY" | "WEEKLY" | "TOTAL" | string;

export interface HealthGoal {
  id: string;
  title: string;
  category: string;
  metricType: GoalMetricType;
  metricKey: string;
  frequency: GoalFrequency;
  frequencyTarget: number | null;
  currentProgress: number;
  targetValue: number;
  currentValue: number;
  targetDate: string | null;
  guidanceText: string;
  unit: string | null;
  status: string;
}

interface ActiveGoalsResponse {
  data: HealthGoal[];
}

export interface GoalMetricLog {
  metricType: string;
  metricKey: string;
  loggedValue: number;
  occurredAt?: string;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export const useSymptoGoals = () => {
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchActiveGoals = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<ActiveGoalsResponse>(
        "/health-goals/active-snapshot",
      );
      setGoals(data.data ?? []);
    } catch (requestError) {
      console.error("Failed to sync active health goals tracker matrix", requestError);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncLogToGoal = useCallback(async (logPayload: GoalMetricLog) => {
    try {
      const { data } = await api.post<ActiveGoalsResponse>(
        "/health-goals/metric-event",
        logPayload,
      );
      setGoals(data.data ?? []);
      return data.data ?? [];
    } catch (requestError) {
      console.error("Goal synchronization failed", requestError);
      throw requestError;
    }
  }, []);

  useEffect(() => {
    void fetchActiveGoals();
  }, [fetchActiveGoals]);

  return {
    goals,
    loading,
    error,
    hasGoals: goals.length > 0,
    syncLogToGoal,
    fetchActiveGoals,
  };
};
