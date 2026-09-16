"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { healthHomeService, type HealthHomeResponse } from "@/services/health-home.service";
import { healthGoalsService } from "@/services/health-goals.service";

const REFRESH_INTERVAL_MS = 15_000;
const DEFAULT_MEDICATION_TARGET = 90;

function normalizeGoals(result: HealthHomeResponse, fullGoals: any[]) {
  const patientWeight = result.patient?.weightKg != null ? Number(result.patient.weightKg) : null;
  const medications = Array.isArray(result.medications) ? result.medications : [];
  const adherenceValues = medications.map((medication: any) => Number(medication?.adherencePercentage)).filter((value: number) => Number.isFinite(value));
  const medicationAdherence = adherenceValues.length ? Number((adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length).toFixed(2)) : null;

  return fullGoals.map((goal: any) => {
    const category = String(goal?.category ?? "").toUpperCase();
    const progress = Array.isArray(goal?.progress) ? goal.progress : [];
    const historicalAchievement = progress.find((item: any) => String(item?.status ?? "").toUpperCase() === "ACHIEVED");
    const latestRecordedProgress = progress[0] ?? null;

    if (category === "SMOKING") {
      const targetValue = Number(goal?.targetValue ?? 0);
      const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 0;
      const hasSmokingMeasurement = latestRecordedProgress?.currentValue != null || latestRecordedProgress?.progressPercent != null;
      const currentValue = hasSmokingMeasurement && goal?.currentValue != null ? Number(goal.currentValue) : hasSmokingMeasurement && latestRecordedProgress?.currentValue != null ? Number(latestRecordedProgress.currentValue) : null;
      const hasReachedTarget = currentValue != null && Number.isFinite(currentValue) && target > 0 && currentValue <= target;
      const storedAsFalseAchievement = String(goal?.status ?? "").toUpperCase() === "ACHIEVED" && !hasReachedTarget;
      const guidanceText = !hasSmokingMeasurement ? `No daily cigarette count logged yet. Your target is ${target || "your configured"} cigarettes/day; log each day to track the step-down taper.` : currentValue != null && currentValue <= target ? `On track: ${currentValue} cigarette${currentValue === 1 ? "" : "s"} today, at or below your ${target}-cigarette daily target.` : `Above target today. Keep logging your daily count so Sympto can track your step-down taper toward ${target} cigarettes/day.`;
      if (storedAsFalseAchievement || !hasSmokingMeasurement) return { ...goal, status: storedAsFalseAchievement ? "ACTIVE" : goal?.status ?? "ACTIVE", currentValue: null, achievedAt: storedAsFalseAchievement ? null : goal?.achievedAt ?? null, description: guidanceText, latestProgress: { ...(latestRecordedProgress ?? {}), currentValue: null, progressPercent: storedAsFalseAchievement ? 0 : Number(latestRecordedProgress?.progressPercent ?? 0), status: "IMPROVING", notes: guidanceText } };
      return { ...goal, currentValue, description: guidanceText, latestProgress: { ...(latestRecordedProgress ?? {}), currentValue, progressPercent: Number(latestRecordedProgress?.progressPercent ?? 0), status: hasReachedTarget ? "ACHIEVED" : "IMPROVING", notes: guidanceText } };
    }

    if (category === "MEDICATION") {
      const targetValue = Number(goal?.targetValue ?? goal?.metricConfig?.frequencyTarget ?? DEFAULT_MEDICATION_TARGET);
      const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : DEFAULT_MEDICATION_TARGET;
      const currentValue = medicationAdherence;
      const progressPercent = currentValue == null ? 0 : Math.min(100, Math.max(0, Math.round((currentValue / target) * 100)));
      const originalStatus = String(goal?.status ?? "").toUpperCase();
      // An explicitly selected medication goal may be persisted as NOT_STARTED.
      // Today must still surface it; NOT_STARTED means no adherence has been logged yet,
      // not that the user did not choose the goal.
      const todayStatus = originalStatus === "NOT_STARTED" ? "ACTIVE" : originalStatus;
      return { ...goal, unit: "%", targetValue: target, currentValue, status: todayStatus, achievedAt: goal?.achievedAt ?? null, latestProgress: { ...(historicalAchievement ?? progress[0] ?? {}), currentValue, progressPercent, status: todayStatus === "ACHIEVED" ? "ACHIEVED" : "IMPROVING" } };
    }

    if (!historicalAchievement && String(goal?.status ?? "").toUpperCase() !== "ACHIEVED") return goal;
    const isWeightGoal = category === "WEIGHT";
    const currentValue = isWeightGoal && Number.isFinite(patientWeight) ? patientWeight : goal?.currentValue ?? historicalAchievement?.currentValue ?? null;
    return { ...goal, status: "ACHIEVED", currentValue, achievedAt: goal?.achievedAt ?? historicalAchievement?.measuredAt ?? new Date().toISOString(), latestProgress: { ...(historicalAchievement ?? {}), currentValue, progressPercent: 100, status: "ACHIEVED" } };
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
      const fullGoals = (Array.isArray(fullGoalsResponse?.data) ? fullGoalsResponse.data : Array.isArray(fullGoalsResponse) ? fullGoalsResponse : []).filter((goal: any) => String(goal?.status ?? "").toUpperCase() !== "CANCELLED");
      const normalizedGoals = normalizeGoals(result, fullGoals);
      setData({ ...result, goals: normalizedGoals, healthGoals: normalizedGoals, today: { ...result.today, activeGoalCount: normalizedGoals.filter((goal: any) => ["ACTIVE", "IN_PROGRESS"].includes(String(goal?.status ?? "").toUpperCase())).length } });
      firstLoad.current = false;
    } catch (requestError) {
      console.error("Failed to load Health Home:", requestError);
      setError(requestError);
    } finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => {
    firstLoad.current = true;
    void loadDashboard();
    const handleNavigation = () => void loadDashboard();
    window.addEventListener("popstate", handleNavigation);
    const refresh = window.setInterval(() => { if (document.visibilityState === "visible") void loadDashboard(); }, REFRESH_INTERVAL_MS);
    return () => { window.removeEventListener("popstate", handleNavigation); window.clearInterval(refresh); };
  }, [loadDashboard]);

  return { data, loading, error, reload: loadDashboard };
}