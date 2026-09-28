"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Bell, CheckCircle2, FileHeart, FolderOpen, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import { healthGoalsService } from "@/services/health-goals.service";
import { patientNotificationsService } from "@/services/patient-notifications.service";
import { canonicalExerciseWeekTotal } from "@/lib/exercise-metric";
import ProtectedRoute from "@/components/auth/protected-route";

function display(value: unknown, fallback = "Not recorded"): string {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function normalizeVitals(data: any) {
  const deviceVitals = Array.isArray(data?.healthSnapshot?.latestMeasurements)
    ? data.healthSnapshot.latestMeasurements.map((item: any) => ({
        type: item.type ?? item.measurementType,
        value: item.value,
        unit: item.unit,
        measuredAt: item.measuredAt,
      }))
    : [];

  const clinicalVitals = Array.isArray(data?.clinicalVitals)
    ? data.clinicalVitals.map((item: any) => ({
        type: item.vitalType?.code ?? item.vitalType?.name,
        value: item.value,
        unit: item.vitalType?.unit,
        measuredAt: item.measuredAt,
      }))
    : [];

  const byType = new Map<string, any>();

  for (const vital of [...deviceVitals, ...clinicalVitals]) {
    const key = String(vital.type ?? "").toUpperCase();
    if (!key) continue;

    const previous = byType.get(key);
    if (
      !previous ||
      new Date(String(vital.measuredAt ?? 0)).getTime() >
        new Date(String(previous.measuredAt ?? 0)).getTime()
    ) {
      byType.set(key, vital);
    }
  }

  return Array.from(byType.values());
}

function itemNames(
  items: any[],
  kind: "allergy" | "condition",
): string[] {
  return items
    .map((item) =>
      kind === "allergy"
        ? item?.allergy?.name ?? item?.name
        : item?.condition?.name ?? item?.name,
    )
    .filter(Boolean) as string[];
}

const ACTIVE_TODAY_GOAL_STATUSES = new Set([
  "ACTIVE",
  "IN_PROGRESS",
  "ON_TRACK",
  "IMPROVING",
  "STAGNANT",
  "DECLINING",
]);

const DEFAULT_GOAL_FREQUENCIES: Record<string, string> = {
  WEIGHT: "TOTAL",
  EXERCISE: "WEEKLY",
  NUTRITION: "DAILY",
  BLOOD_PRESSURE: "DAILY",
  BLOOD_GLUCOSE: "DAILY",
  CHOLESTEROL: "TOTAL",
  MEDICATION: "WEEKLY",
  SLEEP: "DAILY",
  MENTAL_HEALTH: "DAILY",
  HYDRATION: "DAILY",
  SMOKING: "DAILY",
  ALCOHOL: "WEEKLY",
  HEART_RATE: "DAILY",
  OTHER: "TOTAL",
};

const DEFAULT_GOAL_METRICS: Record<string, { metricType: string; metricKey: string }> = {
  WEIGHT: { metricType: "WEIGHT", metricKey: "weight.kg" },
  EXERCISE: { metricType: "EXERCISE", metricKey: "exercise.minutes" },
  NUTRITION: { metricType: "NUTRITION", metricKey: "nutrition.calories" },
  BLOOD_PRESSURE: { metricType: "BLOOD_PRESSURE", metricKey: "blood_pressure.systolic" },
  BLOOD_GLUCOSE: { metricType: "BLOOD_GLUCOSE", metricKey: "blood_glucose.value" },
  CHOLESTEROL: { metricType: "CHOLESTEROL", metricKey: "cholesterol.total" },
  MEDICATION: { metricType: "MEDICATION", metricKey: "medication.adherence" },
  SLEEP: { metricType: "SLEEP", metricKey: "sleep.hours" },
  MENTAL_HEALTH: { metricType: "MENTAL_HEALTH", metricKey: "mental.stress" },
  HYDRATION: { metricType: "HYDRATION", metricKey: "hydration.ml" },
  SMOKING: { metricType: "SMOKING", metricKey: "smoking.cigarettes" },
  ALCOHOL: { metricType: "ALCOHOL", metricKey: "alcohol.drinks" },
  HEART_RATE: { metricType: "HEART_RATE", metricKey: "heart_rate.bpm" },
  OTHER: { metricType: "OTHER", metricKey: "other.value" },
};

const CHECK_IN_GOAL_CATEGORIES = new Set([
  "EXERCISE",
  "SLEEP",
  "MENTAL_HEALTH",
  "HYDRATION",
]);

const VITAL_GOAL_CATEGORIES = new Set([
  "BLOOD_PRESSURE",
  "HEART_RATE",
]);

function requiredMedicationDoses(frequency: unknown): number {
  const normalized = String(frequency ?? "").trim().toUpperCase();
  if (normalized === "TWICE_DAILY") return 2;
  if (normalized === "THREE_TIMES_DAILY") return 3;
  if (normalized === "FOUR_TIMES_DAILY") return 4;
  return 1;
}

function todayBoundsInSouthAfrica() {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const start = new Date(todayKey + "T00:00:00+02:00");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, todayKey };
}

function goalMetric(goal: any) {
  const category = String(goal?.category ?? "OTHER").toUpperCase();
  const fallback = DEFAULT_GOAL_METRICS[category] ?? DEFAULT_GOAL_METRICS.OTHER;
  return {
    category,
    metricType: String(goal?.metricConfig?.metricType ?? goal?.metricType ?? fallback.metricType).toUpperCase(),
    metricKey: String(goal?.metricConfig?.metricKey ?? goal?.metricKey ?? fallback.metricKey),
    frequency: String(
      goal?.metricConfig?.frequency ??
      goal?.frequency ??
      DEFAULT_GOAL_FREQUENCIES[category] ??
      "TOTAL",
    ).toUpperCase(),
  };
}

function medicationPatientId(medication: any) {
  const source = String(medication?.source ?? "").trim().toUpperCase();
  const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
  return (
    medication?.patientMedication?.id ??
    medication?.patientMedicationId ??
    (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication?.id : null)
  );
}

function medicationMatchesGoal(medication: any, goal: any, medicationCount: number) {
  if (!goal || String(goal?.category ?? "").toUpperCase() !== "MEDICATION") return false;

  const linkedGoalId = medication?.healthGoalId ?? medication?.medicationGoalId ?? null;
  if (linkedGoalId && String(goal?.id ?? "") === String(linkedGoalId)) return true;

  const medicationPatientMedicationId =
    medicationPatientId(medication);
  const goalPatientMedicationId =
    goal?.patientMedicationId ??
    goal?.patientMedication?.id ??
    goal?.associatedPatientMedicationId ??
    goal?.associatedPatientMedication?.id ??
    null;

  if (
    medicationPatientMedicationId &&
    goalPatientMedicationId &&
    String(medicationPatientMedicationId) === String(goalPatientMedicationId)
  ) {
    return true;
  }

  const medicationCatalogId =
    medication?.medicationId ??
    medication?.medication?.id ??
    null;
  const goalMedicationId =
    goal?.medicationId ??
    goal?.associatedMedicationId ??
    goal?.associatedMedication?.id ??
    goal?.medication?.id ??
    null;

  if (
    medicationCatalogId &&
    goalMedicationId &&
    String(medicationCatalogId) === String(goalMedicationId)
  ) {
    return true;
  }

  return (
    medicationCount === 1 &&
    String(goal?.title ?? "").trim().toLowerCase() === "manage medication"
  );
}

async function countTodayNeeds(
  data: any,
  hasTodayCheckIn: boolean | null = null,
): Promise<number | null> {
  if (hasTodayCheckIn === null) return null;

  const { start: todayStart, end: todayEnd, todayKey } =
    todayBoundsInSouthAfrica();

  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const localDayKey = (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return dayFormatter.format(date);
  };

  const appointments = (
    Array.isArray(data?.appointments) && data.appointments.length > 0
      ? data.appointments
      : Array.isArray(data?.today?.upcomingAppointments)
        ? data.today.upcomingAppointments
        : []
  ).filter((appointment: any) => localDayKey(appointment?.scheduledStart) === todayKey);

  const allGoals = [
    ...(Array.isArray(data?.goals) ? data.goals : []),
    ...(Array.isArray(data?.healthGoals) ? data.healthGoals : []),
    ...(Array.isArray(data?.activeGoalsArray) ? data.activeGoalsArray : []),
  ].filter(Boolean);

  const seenGoals = new Set<string>();
  const goals = allGoals.filter((goal: any) => {
    const id = String(goal?.id ?? "");
    if (!id || seenGoals.has(id)) return false;
    seenGoals.add(id);

    const status = String(goal?.status ?? "").toUpperCase();
    return ACTIVE_TODAY_GOAL_STATUSES.has(status) ||
      (String(goal?.category ?? "").toUpperCase() === "MEDICATION" && status === "NOT_STARTED");
  });

  const activeSymptoms = (Array.isArray(data?.symptoms) ? data.symptoms : []).filter(
    (symptom: any) => String(symptom?.status ?? "").toUpperCase() === "ACTIVE",
  );

  const deviceAlerts = Array.isArray(data?.wearables?.deviceAlerts)
    ? data.wearables.deviceAlerts
    : [];

  const immunizations = Array.isArray(data?.healthSnapshot?.immunizations)
    ? data.healthSnapshot.immunizations
    : Array.isArray(data?.immunizations)
      ? data.immunizations
      : [];

  const dueImmunizations = immunizations.filter((item: any) => {
    const status = String(item?.status ?? "").toUpperCase();
    if (status === "MISSED") return true;

    return (
      status === "SCHEDULED" &&
      Boolean(item?.nextDueDate) &&
      localDayKey(item.nextDueDate) <= todayKey
    );
  });

  const careTasks = (Array.isArray(data?.carePlans) ? data.carePlans : []).flatMap(
    (plan: any) =>
      (Array.isArray(plan?.tasks) ? plan.tasks : []).filter((task: any) => {
        const status = String(task?.status ?? "").toUpperCase();
        if (["COMPLETED", "CANCELLED"].includes(status) || !task?.dueDate) {
          return false;
        }
        return localDayKey(task.dueDate) <= todayKey;
      }),
  );

  let count =
    appointments.length +
    activeSymptoms.length +
    deviceAlerts.length +
    dueImmunizations.length +
    careTasks.length;

  // Today always exposes one Daily Health Check-in action. It is one shared
  // action even when several goals depend on it.
  const checkInGoalCategories = CHECK_IN_GOAL_CATEGORIES;
  const checkInGoals = goals.filter((goal: any) =>
    checkInGoalCategories.has(goalMetric(goal).category),
  );

  const metricQueries = new Map<
    string,
    { metricType: string; metricKey: string; from: Date; to: Date }
  >();

  const addMetricQuery = (
    goal: any,
    from = todayStart,
    to = todayEnd,
  ) => {
    const { metricType, metricKey } = goalMetric(goal);
    const key = metricType + "|" + metricKey + "|" + from.toISOString();
    metricQueries.set(key, { metricType, metricKey, from, to });
  };

  const startOfSouthAfricaWeek = () => {
    const start = new Date(todayStart);
    const weekday = start.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    start.setUTCDate(start.getUTCDate() - daysFromMonday);
    return start;
  };

  const weekStart = startOfSouthAfricaWeek();

  for (const goal of goals) {
    const { category, frequency } = goalMetric(goal);

    if (checkInGoalCategories.has(category)) {
      if (category === "EXERCISE") {
        addMetricQuery(goal, weekStart, new Date());
      } else {
        addMetricQuery(goal, todayStart, todayEnd);
      }
      continue;
    }

    if (category === "SMOKING") {
      addMetricQuery(goal);
      continue;
    }

    if (category === "ALCOHOL") {
      addMetricQuery(goal, weekStart, new Date());
      continue;
    }

    if (category === "MEDICATION") {
      addMetricQuery(goal);
      continue;
    }

    if (category === "WEIGHT") {
      continue;
    }

    if (VITAL_GOAL_CATEGORIES.has(category) || frequency === "DAILY") {
      addMetricQuery(goal);
    }
  }

  const metricEventsByKey = new Map<string, any[]>();
  const metricQueryFailed = new Set<string>();

  const settled = await Promise.all(
    [...metricQueries.entries()].map(async ([key, definition]) => {
      try {
        const response = await healthGoalsService.getMetricEvents(
          definition.metricType,
          definition.metricKey,
          definition.from,
          definition.to,
        );

        return {
          key,
          events: Array.isArray(response?.events) ? response.events : [],
        };
      } catch {
        return { key, events: null };
      }
    }),
  );

  for (const result of settled) {
    if (result.events === null) {
      metricQueryFailed.add(result.key);
      continue;
    }
    metricEventsByKey.set(result.key, result.events);
  }

  const metricEventsFor = (
    goal: any,
    from = todayStart,
  ) => {
    const { metricType, metricKey } = goalMetric(goal);
    const key = metricType + "|" + metricKey + "|" + from.toISOString();
    return {
      key,
      events: metricEventsByKey.get(key) ?? [],
      failed: metricQueryFailed.has(key),
    };
  };

  const goalTarget = (goal: any): number | null => {
    const raw =
      goal?.metricConfig?.frequencyTarget ??
      goal?.frequencyTarget ??
      goal?.targetValue;

    if (raw === null || raw === undefined || raw === "") return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const goalComparison = (goal: any) =>
    String(
      goal?.metricConfig?.comparison ??
      goal?.comparison ??
      "AT_MOST",
    ).toUpperCase();

  const valueNeedsAttention = (goal: any, value: number | null) => {
    if (value === null || !Number.isFinite(value)) return true;

    const target = goalTarget(goal);
    if (target === null) return false;

    const comparison = goalComparison(goal);

    if (comparison === "AT_LEAST") return value < target;
    if (comparison === "AT_MOST") return value > target;
    if (comparison === "CLOSEST") {
      return Math.abs(value - target) >
        Math.max(0.5, Math.abs(target) * 0.05);
    }
    if (comparison === "INCREASE_TO") return value < target;
    if (comparison === "DECREASE_TO") return value > target;

    return false;
  };

  // The Daily Health Check-in is a single Today action. It is pending when
  // today's check-in is missing, or when a connected check-in goal is still
  // outside its own current-period target after the check-in has been saved.
  if (hasTodayCheckIn === false) {
    count += 1;
  } else {
    let checkInNeedsAttention = false;

    for (const goal of checkInGoals) {
      const { category } = goalMetric(goal);

      if (category === "EXERCISE") {
        const { key, events, failed } = metricEventsFor(goal, weekStart);
        if (failed) {
          checkInNeedsAttention = true;
          break;
        }

        const exerciseEvents = events.map((event: any) => ({
          loggedValue: Number(event?.loggedValue),
          occurredAt: String(event?.occurredAt ?? ""),
          source: event?.source ?? null,
        }));

        const weekTotal = canonicalExerciseWeekTotal(exerciseEvents);
        const target = goalTarget(goal);
        if (target === null || weekTotal < target) {
          checkInNeedsAttention = true;
          break;
        }

        continue;
      }

      const { events, failed } = metricEventsFor(goal);
      if (failed) {
        checkInNeedsAttention = true;
        break;
      }

      const latest =
        [...events]
          .filter((event: any) => Number.isFinite(Number(event?.loggedValue)))
          .sort(
            (a: any, b: any) =>
              new Date(String(b?.occurredAt ?? 0)).getTime() -
              new Date(String(a?.occurredAt ?? 0)).getTime(),
          )[0] ?? null;

      const value =
        latest && Number.isFinite(Number(latest.loggedValue))
          ? Number(latest.loggedValue)
          : null;

      if (valueNeedsAttention(goal, value)) {
        checkInNeedsAttention = true;
        break;
      }
    }

    if (checkInNeedsAttention) count += 1;
  }

  const medications = (
    Array.isArray(data?.today?.activeMedications)
      ? data.today.activeMedications
      : []
  ).filter(
    (medication: any) =>
      String(medication?.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
  );

  const medicationGoals = goals.filter(
    (goal: any) =>
      String(goal?.category ?? "").toUpperCase() === "MEDICATION" ||
      String(goal?.metricType ?? "").toUpperCase() === "MEDICATION" ||
      String(goal?.metricConfig?.metricKey ?? goal?.metricKey ?? "").toLowerCase() ===
        "medication.adherence",
  );

  const medicationName = (medication: any) =>
    String(
      medication?.medication?.name ??
      medication?.name ??
      medication?.medication?.genericName ??
      medication?.medication?.brandName ??
      "",
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const medicationMatchesTodayGoal = (
    medication: any,
    goal: any,
    medicationCount: number,
  ) => {
    const medicationGoalId =
      medication?.healthGoalId ??
      medication?.medicationGoalId ??
      null;

    if (medicationGoalId && String(goal?.id ?? "") === String(medicationGoalId)) {
      return true;
    }

    const targetPatientMedicationId =
      medication?.patientMedication?.id ??
      medication?.patientMedicationId ??
      (
        String(medication?.source ?? "").trim().toUpperCase() !== "PRESCRIPTION" &&
        !String(medication?.id ?? "").startsWith("prescription-item-")
          ? medication?.id
          : null
      );

    const goalPatientMedicationId =
      goal?.patientMedicationId ??
      goal?.patientMedication?.id ??
      goal?.associatedPatientMedicationId ??
      goal?.associatedPatientMedication?.id ??
      null;

    if (
      targetPatientMedicationId &&
      goalPatientMedicationId &&
      String(targetPatientMedicationId) === String(goalPatientMedicationId)
    ) {
      return true;
    }

    const medicationCatalogId =
      medication?.medicationId ??
      medication?.medication?.id ??
      medication?.medication?.medicationId ??
      null;
    const goalMedicationId =
      goal?.associatedMedicationId ??
      goal?.medicationId ??
      goal?.associatedMedication?.id ??
      goal?.medication?.id ??
      null;

    if (
      medicationCatalogId &&
      goalMedicationId &&
      String(medicationCatalogId) === String(goalMedicationId)
    ) {
      return true;
    }

    const name = medicationName(medication);
    const goalNames = [
      goal?.medication?.name,
      goal?.medication?.genericName,
      goal?.medication?.brandName,
      goal?.title,
      goal?.description,
    ]
      .map((value: unknown) =>
        String(value ?? "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    if (name) {
      if (
        goalNames.some(
          (candidate: string) =>
            candidate === name ||
            candidate.includes(name) ||
            name.includes(candidate),
        )
      ) {
        return true;
      }
    }

    return (
      medicationCount === 1 &&
      String(goal?.title ?? "").trim().toLowerCase() === "manage medication"
    );
  };

  if (medicationGoals.length > 0) {
    for (const medication of medications) {
      const matchingGoal = medicationGoals.find((goal: any) =>
        medicationMatchesTodayGoal(medication, goal, medications.length),
      );

      if (!matchingGoal) continue;

      const required = requiredMedicationDoses(
        medication?.frequency ?? medication?.schedule,
      );

      const { events, failed } = metricEventsFor(matchingGoal);

      const patientMedicationIdValue =
        medication?.patientMedication?.id ??
        medication?.patientMedicationId ??
        (
          String(medication?.source ?? "").trim().toUpperCase() !== "PRESCRIPTION" &&
          !String(medication?.id ?? "").startsWith("prescription-item-")
            ? medication?.id
            : null
        );

      if (!patientMedicationIdValue) {
        count += 1;
        continue;
      }

      if (failed) {
        count += 1;
        continue;
      }

      const actionsLoggedToday = events.filter(
        (event: any) =>
          String(event?.sourceId ?? "").startsWith(
            String(patientMedicationIdValue) + ":",
          ),
      ).length;

      if (actionsLoggedToday < required) count += 1;
    }
  }

  const smokingGoal = goals.find(
    (goal: any) => goalMetric(goal).category === "SMOKING",
  );

  if (smokingGoal) {
    const { events, failed } = metricEventsFor(smokingGoal);

    if (failed) {
      count += 1;
    } else {
      const todayKeyValue = todayKey;
      const loggedEvent =
        events.find(
          (event: any) =>
            String(event?.sourceId ?? "") ===
            String(smokingGoal.id) + ":" + todayKeyValue,
        ) ?? null;

      if (!loggedEvent) {
        count += 1;
      } else {
        const loggedValue = Number(loggedEvent?.loggedValue);
        const target = goalTarget(smokingGoal);
        if (target !== null && Number.isFinite(loggedValue) && loggedValue > target) {
          count += 1;
        }
      }
    }
  }

  const alcoholGoal = goals.find(
    (goal: any) => goalMetric(goal).category === "ALCOHOL",
  );

  if (alcoholGoal) {
    const { events, failed } = metricEventsFor(alcoholGoal, weekStart);

    if (failed) {
      count += 1;
    } else {
      const weeklyTotal = events.reduce((sum: number, event: any) => {
        const value = Number(event?.loggedValue);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);

      const target = goalTarget(alcoholGoal);
      if (target === null || weeklyTotal > target) {
        count += 1;
      }
    }
  }

  const exerciseGoal = goals.find(
    (goal: any) => goalMetric(goal).category === "EXERCISE",
  );

  // Exercise is represented inside the shared Daily Health Check-in, so it
  // does not create a second counter item here.
  void exerciseGoal;

  const vitalGoals = goals.filter((goal: any) =>
    VITAL_GOAL_CATEGORIES.has(goalMetric(goal).category),
  );

  if (vitalGoals.length > 0) {
    let vitalsNeedAttention = false;

    for (const goal of vitalGoals) {
      const { events, failed } = metricEventsFor(goal);

      if (failed || events.length === 0) {
        vitalsNeedAttention = true;
        break;
      }

      const latest =
        [...events]
          .filter((event: any) => Number.isFinite(Number(event?.loggedValue)))
          .sort(
            (a: any, b: any) =>
              new Date(String(b?.occurredAt ?? 0)).getTime() -
              new Date(String(a?.occurredAt ?? 0)).getTime(),
          )[0] ?? null;

      const value =
        latest && Number.isFinite(Number(latest.loggedValue))
          ? Number(latest.loggedValue)
          : null;

      if (valueNeedsAttention(goal, value)) {
        vitalsNeedAttention = true;
        break;
      }
    }

    if (vitalsNeedAttention) count += 1;
  }

  const genericDailyGoals = goals.filter((goal: any) => {
    const { category, frequency } = goalMetric(goal);
    if ([
      "MEDICATION",
      "SMOKING",
      "ALCOHOL",
      "WEIGHT",
      "EXERCISE",
      "SLEEP",
      "MENTAL_HEALTH",
      "HYDRATION",
      "BLOOD_PRESSURE",
      "HEART_RATE",
    ].includes(category)) {
      return false;
    }
    return frequency === "DAILY";
  });

  for (const goal of genericDailyGoals) {
    const { events, failed } = metricEventsFor(goal);

    if (failed || events.length === 0) {
      count += 1;
      continue;
    }

    const latest =
      [...events]
        .filter((event: any) => Number.isFinite(Number(event?.loggedValue)))
        .sort(
          (a: any, b: any) =>
            new Date(String(b?.occurredAt ?? 0)).getTime() -
            new Date(String(a?.occurredAt ?? 0)).getTime(),
        )[0] ?? null;

    const value =
      latest && Number.isFinite(Number(latest.loggedValue))
        ? Number(latest.loggedValue)
        : null;

    if (valueNeedsAttention(goal, value)) count += 1;
  }

  const weightGoal = goals.find(
    (goal: any) => goalMetric(goal).category === "WEIGHT",
  );

  if (weightGoal) {
    const status = String(
      weightGoal?.latestProgress?.status ??
      weightGoal?.progress?.[0]?.status ??
      "",
    ).toUpperCase();

    if (!["ACHIEVED", "COMPLETED"].includes(status)) {
      const comparison = String(
        weightGoal?.metricConfig?.comparison ??
        weightGoal?.comparison ??
        "CLOSEST",
      ).toUpperCase();

      const current = Number(
        weightGoal?.latestProgress?.currentValue ??
        weightGoal?.progress?.[0]?.currentValue ??
        weightGoal?.currentValue,
      );

      const target = goalTarget(weightGoal);

      if (!Number.isFinite(current) || target === null) {
        // No current weight/target information means the goal needs the user
        // to open Health Vitals and/or complete its configuration.
        count += 1;
      } else if (
        (comparison === "DECREASE_TO" && current > target) ||
        (comparison === "INCREASE_TO" && current < target)
      ) {
        count += 1;
      } else if (comparison === "CLOSEST") {
        const stableBand = Math.max(1.5, Math.abs(target) * 0.02);
        if (Math.abs(current - target) > stableBand) count += 1;
      }
    }
  }

  return count;
}
function countActiveGoals(data: any) {
  return (Array.isArray(data?.goals) ? data.goals : []).filter(
    (goal: any) =>
      !["ACHIEVED", "ARCHIVED", "CANCELLED", "DELETED", "ON_HOLD", "EXPIRED"].includes(
        String(goal?.status ?? "").toUpperCase(),
      ),
  ).length;
}

function recentSymptomFrom(data: any, symptomFeed: any[]) {
  const symptoms =
    symptomFeed.length > 0
      ? symptomFeed
      : Array.isArray(data?.symptoms)
        ? data.symptoms
        : [];
  return [...symptoms]
    .filter((symptom: any) => symptom?.id && (symptom?.startedAt || symptom?.createdAt))
    .sort(
      (a: any, b: any) =>
        new Date(String(b.startedAt ?? b.createdAt)).getTime() -
        new Date(String(a.startedAt ?? a.createdAt)).getTime(),
    )[0] ?? null;
}

function symptomLabel(symptom: any): string {
  if (!symptom) return "";
  if (symptom.title) return String(symptom.title);
  const names = Array.isArray(symptom.symptoms)
    ? symptom.symptoms
        .map((item: any) => item?.symptom?.name ?? item?.name)
        .filter(Boolean)
    : [];
  return names[0] ? String(names[0]) : "Symptom";
}

function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 || hour < 5) return "Good evening";
  return "Hello";
}

function formatSymptomDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatAppointmentDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function RecordedChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={"inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black tracking-[-0.01em] shadow-[0_3px_12px_rgba(11,45,84,0.08)] backdrop-blur-md ring-1 ring-inset " + className}
    >
      {children}
    </span>
  );
}
function ActionLink({
  href,
  children,
  className = "",
  ariaLabel,
  id,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  id?: string;
}) {
  return (
    <Link
      id={id}
      href={href}
      prefetch
      aria-label={ariaLabel}
      className={
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2 " +
        className
      }
    >
      {children}
    </Link>
  );
}


export default function HealthHome({ patientId }: { patientId?: string }) {
  const { data, loading, error, reload } = useDashboard(patientId);
  const [symptomFeed, setSymptomFeed] = useState<any[]>([]);
  const [journalRecordCount, setJournalRecordCount] = useState(0);
  const [hasTodayCheckIn, setHasTodayCheckIn] = useState<boolean | null>(null);
  const [todayActionCount, setTodayActionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    Promise.all([
      healthJournalService.getSymptoms({ limit: 100 }),
      healthJournalService.getAll({ page: 1, limit: 100 }),
    ])
      .then(([symptoms, journals]) => {
        if (!active) return;
        setSymptomFeed(Array.isArray(symptoms) ? symptoms : []);
        setJournalRecordCount(Number(journals?.pagination?.total ?? journals?.data?.length ?? 0));

        const todayKey = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Johannesburg",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        const hasCheckIn = (Array.isArray(journals?.data) ? journals.data : []).some((journal: any) => {
          if (journal?.title !== "Daily Health Check-in" || !journal?.createdAt) return false;
          const journalDate = new Date(String(journal.createdAt));
          if (Number.isNaN(journalDate.getTime())) return false;
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Johannesburg",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(journalDate) === todayKey;
        });

        setHasTodayCheckIn(hasCheckIn);
      })
      .catch(() => {
        if (!active) return;
        setSymptomFeed([]);
        setHasTodayCheckIn(null);
      });

    return () => {
      active = false;
    };
  }, [data?.patient?.id, data?.generatedAt]);

  useEffect(() => {
    if (!data?.patient?.id || hasTodayCheckIn === null) {
      setTodayActionCount(null);
      return;
    }

    let active = true;

    void countTodayNeeds(data, hasTodayCheckIn)
      .then((count) => {
        if (active) setTodayActionCount(count);
      })
      .catch(() => {
        if (active) setTodayActionCount(null);
      });

    return () => {
      active = false;
    };
  }, [data?.patient?.id, data?.generatedAt, hasTodayCheckIn]);

  useEffect(() => {
    const refreshDashboard = () => void reload();

    window.addEventListener("sympto:health-checkin-updated", refreshDashboard);

    return () => {
      window.removeEventListener("sympto:health-checkin-updated", refreshDashboard);
    };
  }, [reload]);

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    const snapshotNotifications = Array.isArray(data?.today?.notifications)
      ? data.today.notifications
      : [];

    const snapshotUnread = snapshotNotifications.filter((notification: any) => {
      if (notification?.readAt) return false;
      if (!notification?.scheduledFor) return true;

      const scheduledAt = new Date(String(notification.scheduledFor)).getTime();
      return Number.isFinite(scheduledAt) && scheduledAt <= Date.now();
    }).length;

    setUnreadNotificationCount(snapshotUnread);

    const refresh = async () => {
      try {
        const count = await patientNotificationsService.getUnreadCount();
        if (active) setUnreadNotificationCount(count);
      } catch {
        // Keep the dashboard snapshot count when the live count cannot be loaded.