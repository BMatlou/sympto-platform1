"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  healthHomeService,
  type HealthHomeResponse,
} from "@/services/health-home.service";
import { healthGoalsService } from "@/services/health-goals.service";

const REFRESH_INTERVAL_MS = 15_000;

function normalizeGoals(result: HealthHomeResponse, fullGoals: any[]) {
  const patientWeight = result.patient?.weightKg != null ? Number(result.patient.weightKg) : null;

  return fullGoals.map((goal: any) => {
    const progress = Array.isArray(goal?.progress) ? goal.progress : [];
    const historicalAchievement = progress.find(
      (item: any) => String(item?.status ?? "").toUpperCase() === "ACHIEVED",
    );
    const isWeightGoal = String(goal?.category ?? "").toUpperCase() === "WEIGHT";

    if (!historicalAchievement && String(goal?.status ?? "").toUpperCase() !== "ACHIEVED") {
      return goal;
    }

    const currentValue = isWeightGoal && Number.isFinite(patientWeight)
      ? patientWeight
      : goal?.currentValue ?? historicalAchievement?.currentValue ?? null;

    return {
      ...goal,
      status: "ACHIEVED",
      currentValue,
      achievedAt: goal?.achievedAt ?? historicalAchievement?.measuredAt ?? new Date().toISOString(),
      latestProgress: {
        ...(historicalAchievement ?? {}),
        currentValue,
        progressPercent: 100,
        status: "ACHIEVED",
      },
    };
  });
}

export function useDashboard() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const [data, setData] = useState<HealthHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const firstLoad = useRef(true);

  const loadDashboard = useCallback(async () => {
    try {
      if (firstLoad.current) setLoading(true);
      setError(null);

      const result = await healthHomeService.getHealthHome(patientId);
      const fullGoalsResponse = await healthGoalsService.list(result.patient.id);
      const fullGoals = Array.isArray(fullGoalsResponse?.data)
        ? fullGoalsResponse.data
        : Array.isArray(fullGoalsResponse)
          ? fullGoalsResponse
          : [];
      const normalizedGoals = normalizeGoals(result, fullGoals);

      setData({
        ...result,
        goals: normalizedGoals,
        healthGoals: normalizedGoals,
        today: {
          ...result.today,
          activeGoalCount: normalizedGoals.filter(
            (goal: any) => String(goal?.status ?? "").toUpperCase() === "ACTIVE",
          ).length,
        },
      });
      firstLoad.current = false;
    } catch (requestError) {
      console.error("Failed to load Health Home:", requestError);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    // Reload whenever the selected patient changes. Family-member navigation
    // uses ?patientId=..., so the page must never retain another patient's data.
    firstLoad.current = true;
    void loadDashboard();

    const handleNavigation = () => void loadDashboard();
    window.addEventListener("popstate", handleNavigation);

    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.clearInterval(refresh);
    };
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    reload: loadDashboard,
  };
}
