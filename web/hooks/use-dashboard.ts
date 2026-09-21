"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { healthHomeService, type HealthHomeResponse } from "@/services/health-home.service";
import { healthGoalsService } from "@/services/health-goals.service";
import { api } from "@/lib/api";

const REFRESH_INTERVAL_MS = 15_000;
const DEFAULT_MEDICATION_TARGET = 90;

function normalizeMedicationDetails(medications: any[]): any[] {
  return medications.map((medication: any) => {
    const saved = medication?.patientMedication ?? medication?.patient_medication ?? {};
    const first = (key: string, fallback: any = "") => {
      const direct = medication?.[key];
      const nested = saved?.[key];
      return direct !== undefined && direct !== null && direct !== "" ? direct : nested !== undefined && nested !== null && nested !== "" ? nested : fallback;
    };
    const status = first("status", "");
    const source = String(medication?.source ?? saved?.source ?? "").trim().toUpperCase();
    const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
    const resolvedPatientMedicationId =
      medication?.patientMedicationId ??
      saved?.patientMedicationId ??
      saved?.id ??
      (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication?.id : null);
    return { ...medication, ...saved, patientMedicationId: resolvedPatientMedicationId, medicationId: medication?.medicationId ?? saved?.medicationId ?? medication?.medication?.id ?? saved?.medication?.id ?? saved?.medication?.medicationId ?? null, dosage: first("dosage", first("dose", "")), frequency: first("frequency", first("schedule", "")), route: String(first("route", first("administrationRoute", ""))).trim().toUpperCase(), indication: first("indication", first("reason", "")), instructions: first("instructions", first("additionalInstructions", "")), prescribedBy: first("prescribedBy", first("prescriber", first("provider", ""))), startedAt: first("startedAt", first("startDate", "")), endedAt: first("endedAt", first("endDate", "")), ongoing: first("ongoing", first("isOngoing", status ? String(status).toUpperCase() === "ACTIVE" : true)), sideEffects: first("sideEffects", first("sideEffect", "")), effectiveness: first("effectiveness", first("efficacy", "")), notes: first("notes", first("additionalNotes", "")), status };
  });
}

async function hydrateSavedMedicationDetails(medications: any[]): Promise<any[]> {
  return Promise.all(medications.map(async (medication: any) => {
    const source = String(medication?.source ?? "").trim().toUpperCase();
    const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
    const patientMedicationId =
      medication?.patientMedicationId ??
      medication?.patientMedication?.id ??
      (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication?.id : null);
    if (!patientMedicationId) return medication;
    try {
      const response = await api.get(`/patient-medications/${encodeURIComponent(String(patientMedicationId))}`);
      const payload: any = response.data;
      const record = payload?.data ?? payload;
      if (!record || typeof record !== "object") return medication;
      return normalizeMedicationDetails([{ ...medication, ...record }])[0];
    } catch (error) {
      console.warn(`Could not load complete saved medication ${patientMedicationId}; using existing medication data.`, error);
      return medication;
    }
  }));
}

function normalizeGoals(result: HealthHomeResponse, fullGoals: any[]) {
  const patientWeight = result.patient?.weightKg != null ? Number(result.patient.weightKg) : null;
  const medications = Array.isArray(result.medications) ? result.medications : [];
  return fullGoals.map((goal: any) => {
    const category = String(goal?.category ?? "").toUpperCase();
    const progress = Array.isArray(goal?.progress) ? goal.progress : [];
    const historicalAchievement = progress.find((item: any) => String(item?.status ?? "").toUpperCase() === "ACHIEVED");
    const latestRecordedProgress = progress[0] ?? null;
    if (category === "SMOKING") {
      const targetValue = Number(goal?.targetValue ?? 0); const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 0; const hasSmokingMeasurement = latestRecordedProgress?.currentValue != null || latestRecordedProgress?.progressPercent != null; const currentValue = hasSmokingMeasurement && goal?.currentValue != null ? Number(goal.currentValue) : hasSmokingMeasurement && latestRecordedProgress?.currentValue != null ? Number(latestRecordedProgress.currentValue) : null; const hasReachedTarget = currentValue != null && Number.isFinite(currentValue) && target > 0 && currentValue <= target; const storedAsFalseAchievement = String(goal?.status ?? "").toUpperCase() === "ACHIEVED" && !hasReachedTarget; const guidanceText = !hasSmokingMeasurement ? `No daily cigarette count logged yet. Your target is ${target || "your configured"} cigarettes/day; log each day to track the step-down taper.` : currentValue != null && currentValue <= target ? `On track: ${currentValue} cigarette${currentValue === 1 ? "" : "s"} today, at or below your ${target}-cigarette daily target.` : `Above target today. Keep logging your daily count so Sympto can track its step-down taper toward ${target} cigarettes/day.`; if (storedAsFalseAchievement || !hasSmokingMeasurement) return { ...goal, status: storedAsFalseAchievement ? "ACTIVE" : goal?.status ?? "ACTIVE", currentValue: null, achievedAt: storedAsFalseAchievement ? null : goal?.achievedAt ?? null, description: guidanceText, latestProgress: { ...(latestRecordedProgress ?? {}), currentValue: null, progressPercent: storedAsFalseAchievement ? 0 : Number(latestRecordedProgress?.progressPercent ?? 0), status: "IMPROVING", notes: guidanceText } }; return { ...goal, currentValue, description: guidanceText, latestProgress: { ...(latestRecordedProgress ?? {}), currentValue, progressPercent: Number(latestRecordedProgress?.progressPercent ?? 0), status: hasReachedTarget ? "ACHIEVED" : "IMPROVING", notes: guidanceText } };
    }
    if (category === "MEDICATION") {
      const targetValue = Number(goal?.targetValue ?? goal?.metricConfig?.frequencyTarget ?? DEFAULT_MEDICATION_TARGET);
      const target = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : DEFAULT_MEDICATION_TARGET;
      const linkedPatientMedicationId = goal?.patientMedicationId ?? goal?.patientMedication?.id ?? goal?.associatedPatientMedicationId ?? goal?.associatedPatientMedication?.id ?? null;
      const linkedMedication = linkedPatientMedicationId
        ? medications.find((medication: any) => String(medication?.patientMedicationId ?? medication?.patientMedication?.id ?? medication?.id ?? "") === String(linkedPatientMedicationId))
        : medications.length === 1 ? medications[0] : null;
      const rawCurrentValue = linkedMedication?.adherencePercentage ?? (linkedMedication as any)?.adherence?.percentage ?? null;
      const currentValue = rawCurrentValue == null ? null : Number(rawCurrentValue);
      const safeCurrentValue = Number.isFinite(currentValue) ? currentValue : null;
      const progressPercent = safeCurrentValue == null ? 0 : Math.min(100, Math.max(0, Math.round((safeCurrentValue / target) * 100)));
      const originalStatus = String(goal?.status ?? "").toUpperCase();
      const todayStatus = originalStatus === "NOT_STARTED" ? "ACTIVE" : originalStatus;
      return { ...goal, unit: "%", targetValue: target, currentValue: safeCurrentValue, status: todayStatus, achievedAt: goal?.achievedAt ?? null, latestProgress: { ...(historicalAchievement ?? progress[0] ?? {}), currentValue: safeCurrentValue, progressPercent, status: todayStatus === "ACHIEVED" ? "ACHIEVED" : "IMPROVING" } };
    }
    if (!historicalAchievement && String(goal?.status ?? "").toUpperCase() !== "ACHIEVED") return goal;
    const isWeightGoal = category === "WEIGHT"; const currentValue = isWeightGoal && Number.isFinite(patientWeight) ? patientWeight : goal?.currentValue ?? historicalAchievement?.currentValue ?? null;
    return { ...goal, status: "ACHIEVED", currentValue, achievedAt: goal?.achievedAt ?? historicalAchievement?.measuredAt ?? new Date().toISOString(), latestProgress: { ...(historicalAchievement ?? {}), currentValue, progressPercent: 100, status: "ACHIEVED" } };
  });
}

export function useDashboard() {
  const searchParams = useSearchParams(); const patientId = searchParams.get("patientId") || undefined; const [data, setData] = useState<HealthHomeResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const firstLoad = useRef(true); const loadSequence = useRef(0);
  const loadDashboard = useCallback(async () => { const requestId = ++loadSequence.current; try { if (firstLoad.current) setLoading(true); setError(null); const result = await healthHomeService.getHealthHome(patientId); const normalizedMedications = normalizeMedicationDetails(Array.isArray(result.medications) ? result.medications : []); const hydratedMedications = await hydrateSavedMedicationDetails(normalizedMedications); const fullGoalsResponse = await healthGoalsService.list(result.patient.id); const fullGoals = (Array.isArray(fullGoalsResponse?.data) ? fullGoalsResponse.data : Array.isArray(fullGoalsResponse) ? fullGoalsResponse : []).filter((goal: any) => { const status = String(goal?.status ?? "").toUpperCase(); return !["CANCELLED", "DELETED", "ARCHIVED"].includes(status) && !goal?.deletedAt; }); const normalizedGoals = normalizeGoals({ ...result, medications: hydratedMedications }, fullGoals); if (requestId !== loadSequence.current) return; setData({ ...result, medications: hydratedMedications, goals: normalizedGoals, healthGoals: normalizedGoals, today: { ...result.today, activeMedications: hydratedMedications, activeGoalCount: normalizedGoals.filter((goal: any) => ["ACTIVE", "IN_PROGRESS"].includes(String(goal?.status ?? "").toUpperCase())).length } }); firstLoad.current = false; } catch (requestError) { if (requestId !== loadSequence.current) return; console.error("Failed to load Health Home:", requestError); const message = requestError instanceof Error ? requestError.message : typeof requestError === "string" ? requestError : "We could not load your Health Home."; setError(message); } finally { if (requestId === loadSequence.current) setLoading(false); } }, [patientId]);
  useEffect(() => { firstLoad.current = true; void loadDashboard(); const handleNavigation = () => void loadDashboard(); const handleGoalChange = () => void loadDashboard(); const handleFocus = () => void loadDashboard(); const handleVisibility = () => { if (document.visibilityState === "visible") void loadDashboard(); }; window.addEventListener("popstate", handleNavigation); window.addEventListener("sympto:health-goal-updated", handleGoalChange); window.addEventListener("focus", handleFocus); document.addEventListener("visibilitychange", handleVisibility); const refresh = window.setInterval(() => { if (document.visibilityState === "visible") void loadDashboard(); }, REFRESH_INTERVAL_MS); return () => { window.removeEventListener("popstate", handleNavigation); window.removeEventListener("sympto:health-goal-updated", handleGoalChange); window.removeEventListener("focus", handleFocus); document.removeEventListener("visibilitychange", handleVisibility); window.clearInterval(refresh); }; }, [loadDashboard]);
  return { data, loading, error, reload: loadDashboard };
}
