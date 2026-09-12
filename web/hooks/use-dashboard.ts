"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  healthHomeService,
  type HealthHomeResponse,
} from "@/services/health-home.service";
import { healthGoalsService } from "@/services/health-goals.service";

const REFRESH_INTERVAL_MS = 15_000;
const DEFAULT_MEDICATION_TARGET = 90;

function normalizeGoals(result: HealthHomeResponse, fullGoals: any[]) {
  const patientWeight = result.patient?.weightKg != null ? Number(result.patient.weightKg) : null;
  const medications = Array.isArray(result.medications) ? result.medications : [];
  const adherenceValues = medications
    .map((medication: any) => Number(medication?.adherencePercentage))
    .filter((value: number) => Number.isFinite(value));
  const medicationAdherence = adherenceValues.length
    ? Number((adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length).toFixed(2))
    : null;

  return fullGoals.map((goal: any) => {
    const category = String(goal?.category ?? "").toUpperCase();
    const progress = Array.isArray(goal?.progress) ? goal.progress : [];
    const historicalAchievement = progress.find(
      (item: any) => String(item?.status ?? "").toUpperCase() === "ACHIEVED",
    );
    const isWeightGoal = category === "WEIGHT";
    const isMedicationGoal = category === "MEDICATION";

    if (isMedicationGoal) {
      const targetValue = Number(goal?.targetValue ?? goal?.metricConfig?.frequencyTarget ?? DEFAULT_MEDICATION_TARGET);
      const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : DEFAULT_MEDICATION_TARGET;
      const currentValue = medicationAdherence;
      const achieved = currentValue != null && currentValue >= target;
      const progressPercent = currentValue == null ? 0 : Math.min(100, Math.max(0, Math.round((currentValue / target) * 100)));

      return {
        ...goal,
        unit: "%",
        targetValue: target,
        currentValue,
        status: achieved ? "ACHIEVED" : "ACTIVE",
        achievedAt: achieved ? goal?.achievedAt ?? new Date().toISOString() : goal?.achievedAt ?? null,
        latestProgress: {
          ...(historicalAchievement ?? progress[0] ?? {}),
          currentValue,
          progressPercent,
          status: achieved ? "ACHIEVED" : "IMPROVING",
        },
      };
    }

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
