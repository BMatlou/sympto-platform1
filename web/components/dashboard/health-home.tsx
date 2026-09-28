"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Bell, CheckCircle2, FileHeart, FolderOpen, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import { healthGoalsService } from "@/services/health-goals.service";
import { patientNotificationsService } from "@/services/patient-notifications.service";
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
  });

  const appointments = (
    Array.isArray(data?.appointments) && data.appointments.length > 0
      ? data.appointments
      : Array.isArray(data?.today?.upcomingAppointments)
        ? data.today.upcomingAppointments
        : []
  ).filter((appointment: any) => {
    if (!appointment?.scheduledStart) return false;
    const date = new Date(String(appointment.scheduledStart));
    if (Number.isNaN(date.getTime())) return false;
    return dayFormatter.format(date) === todayKey;
  });

  const allGoals = [
    ...(Array.isArray(data?.goals) ? data.goals : []),
    ...(Array.isArray(data?.activeGoalsArray) ? data.activeGoalsArray : []),
  ].filter(Boolean);

  const seenGoals = new Set<string>();
  const goals = allGoals.filter((goal: any) => {
    const id = String(goal?.id ?? "");
    if (!id || seenGoals.has(id)) return false;
    seenGoals.add(id);

    const status = String(goal?.status ?? "").toUpperCase();
    const category = String(goal?.category ?? "").toUpperCase();

    return (
      ACTIVE_TODAY_GOAL_STATUSES.has(status) ||
      (category === "MEDICATION" && status === "NOT_STARTED")
    );
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

    const dueDate = item?.nextDueDate
      ? new Date(String(item.nextDueDate))
      : null;

    return Boolean(
      dueDate &&
      !Number.isNaN(dueDate.getTime()) &&
      status === "SCHEDULED" &&
      dayFormatter.format(dueDate) <= todayKey,
    );
  });

  const careTasks = (Array.isArray(data?.carePlans) ? data.carePlans : []).flatMap(
    (plan: any) =>
      (Array.isArray(plan?.tasks) ? plan.tasks : []).filter((task: any) => {
        const status = String(task?.status ?? "").toUpperCase();
        if (["COMPLETED", "CANCELLED"].includes(status) || !task?.dueDate) {
          return false;
        }

        const dueDate = new Date(String(task.dueDate));
        return (
          !Number.isNaN(dueDate.getTime()) &&
          dayFormatter.format(dueDate) <= todayKey
        );
      }),
  );

  let count =
    appointments.length +
    activeSymptoms.length +
    deviceAlerts.length +
    dueImmunizations.length +
    careTasks.length +
    (hasTodayCheckIn === false ? 1 : 0);

  const goalsByCategory = new Map<string, any[]>();
  for (const goal of goals) {
    const { category } = goalMetric(goal);
    const bucket = goalsByCategory.get(category) ?? [];
    bucket.push(goal);
    goalsByCategory.set(category, bucket);
  }

  const metricQueries = new Map<
    string,
    { metricType: string; metricKey: string }
  >();

  const addMetricQuery = (goal: any) => {
    const { metricType, metricKey } = goalMetric(goal);
    metricQueries.set(metricType + "|" + metricKey, { metricType, metricKey });
  };

  for (const goal of goals) {
    const { category, frequency } = goalMetric(goal);

    if (
      CHECK_IN_GOAL_CATEGORIES.has(category) ||
      category === "MEDICATION" ||
      category === "SMOKING" ||
      category === "ALCOHOL" ||
      category === "WEIGHT"
    ) {
      continue;
    }

    if (VITAL_GOAL_CATEGORIES.has(category) || frequency === "DAILY") {
      addMetricQuery(goal);
    }
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
    (goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION",
  );

  if (medicationGoals.length > 0) {
    metricQueries.set("MEDICATION|medication.adherence", {
      metricType: "MEDICATION",
      metricKey: "medication.adherence",
    });
  }

  if (goalsByCategory.has("SMOKING")) {
    metricQueries.set("SMOKING|smoking.cigarettes", {
      metricType: "SMOKING",
      metricKey: "smoking.cigarettes",
    });
  }

  const metricEventsByKey = new Map<string, any[]>();

  try {
    await Promise.all(
      [...metricQueries.entries()].map(async ([key, definition]) => {
        const response = await healthGoalsService.getMetricEvents(
          definition.metricType,
          definition.metricKey,
          todayStart,
          todayEnd,
        );

        metricEventsByKey.set(
          key,
          Array.isArray(response?.events) ? response.events : [],
        );
      }),
    );
  } catch {
    return null;
  }

  if (medicationGoals.length > 0) {
    const medicationEvents =
      metricEventsByKey.get("MEDICATION|medication.adherence") ?? [];

    for (const medication of medications) {
      const patientMedicationIdValue = medicationPatientId(medication);
      if (!patientMedicationIdValue) continue;

      const matchingGoal = medicationGoals.find((goal: any) =>
        medicationMatchesGoal(medication, goal, medications.length),
      );
      if (!matchingGoal) continue;

      const required = requiredMedicationDoses(
        medication?.frequency ?? medication?.schedule,
      );

      const actionsLoggedToday = medicationEvents.filter(
        (event: any) =>
          String(event?.sourceId ?? "").startsWith(
            String(patientMedicationIdValue) + ":",
          ),
      ).length;

      if (actionsLoggedToday < required) count += 1;
    }
  }

  const smokingGoal = goalsByCategory.get("SMOKING")?.[0] ?? null;
  if (smokingGoal) {
    const smokingEvents =
      metricEventsByKey.get("SMOKING|smoking.cigarettes") ?? [];

    const loggedToday = smokingEvents.some((event: any) =>
      String(event?.sourceId ?? "").startsWith(String(smokingGoal.id) + ":"),
    );

    if (!loggedToday) count += 1;
  }

  let hasVitalsAction = false;

  for (const goal of goals) {
    const { category, metricType, metricKey, frequency } = goalMetric(goal);

    if (CHECK_IN_GOAL_CATEGORIES.has(category)) continue;
    if (["MEDICATION", "SMOKING", "ALCOHOL", "WEIGHT"].includes(category)) {
      continue;
    }

    if (VITAL_GOAL_CATEGORIES.has(category)) {
      const events =
        metricEventsByKey.get(metricType + "|" + metricKey) ?? [];

      if (events.length === 0) hasVitalsAction = true;
      continue;
    }

    if (frequency !== "DAILY") continue;

    const events = metricEventsByKey.get(metricType + "|" + metricKey) ?? [];
    if (events.length === 0) count += 1;
  }

  if (hasVitalsAction) count += 1;

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
      }
    };

    void refresh();

    const timer = window.setInterval(() => void refresh(), 15_000);

    const refreshOnFocus = () => void refresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [data?.patient?.id, data?.generatedAt]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f7fbfb] p-4 pt-[72px] sm:p-8 sm:pt-[88px] lg:pt-8">
          <div className="mx-auto max-w-[1240px] space-y-4" aria-busy="true">
            <div className="h-[360px] animate-pulse rounded-b-[42px] rounded-t-[30px] bg-white" />
            <div className="h-10 animate-pulse rounded-2xl bg-white" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-3xl bg-white"
              />
            ))}
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f7fbfb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
              Sympto
            </p>
            <h1 className="mt-2 text-xl font-black text-[#0b2d54]">
              Your health screen could not load
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your saved health information has not been changed. Please try
              again.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 min-h-11 rounded-2xl bg-[#0b2d54] px-5 py-2.5 text-sm font-black text-white transition-all duration-200 hover:bg-slate-100 hover:text-[#0b2d54]"
            >
              Try again
            </button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const greeting = getTimeGreeting();

  const firstName =
    data.patient?.firstName ||
    data.profile?.preferredName ||
    data.profile?.firstName ||
    "Dankie";

  const medications = Array.isArray(data.today?.activeMedications)
    ? data.today.activeMedications
    : [];
  const appointments = Array.isArray(data.today?.upcomingAppointments)
    ? data.today.upcomingAppointments
    : [];

  const activeGoalCount = countActiveGoals(data);
  const dashboardNotifications = Array.isArray(data?.today?.notifications)
    ? data.today.notifications
    : [];
  const attentionItems = Array.isArray(data?.attention) ? data.attention : [];
  const priorityItem = attentionItems[0] ?? null;
  const nextAppointment = (appointments[0] ?? null) as any;

  const recentSymptom = recentSymptomFrom(data, symptomFeed);
  const recentSymptomStatus = String(recentSymptom?.status ?? "").toUpperCase();
  const recentSymptomAt =
    recentSymptom?.startedAt ?? recentSymptom?.createdAt ?? null;

  // Chips shown on the three navigation cards are derived only from records
  // already loaded for this dashboard; they are not hard-coded health data.
  const todayChips = [
    medications.length > 0 ? `${medications.length} med${medications.length === 1 ? "" : "s"}` : null,
    activeGoalCount > 0 ? `${activeGoalCount} goal${activeGoalCount === 1 ? "" : "s"}` : null,
    appointments.length > 0 ? `${appointments.length} visit${appointments.length === 1 ? "" : "s"}` : null,
  ].filter((chip): chip is string => Boolean(chip));

  const activeConditions = Array.isArray(data.conditions)
    ? data.conditions
    : Array.isArray(data.healthSnapshot?.activeConditions)
      ? data.healthSnapshot.activeConditions
      : [];
  const activeAllergies = Array.isArray(data.allergies)
    ? data.allergies
    : Array.isArray(data.healthSnapshot?.activeAllergies)
      ? data.healthSnapshot.activeAllergies
      : [];

  const clinicChips = [
    activeConditions.length > 0
      ? `${activeConditions.length} condition${activeConditions.length === 1 ? "" : "s"}`
      : null,
    activeAllergies.length > 0
      ? `${activeAllergies.length} allerg${activeAllergies.length === 1 ? "y" : "ies"}`
      : null,
  ].filter((chip): chip is string => Boolean(chip));

  const journalRecordLabel = `${journalRecordCount} record${journalRecordCount === 1 ? "" : "s"}`;
  const symptomRecordLabel = `${symptomFeed.length} symptom${symptomFeed.length === 1 ? "" : "s"}`;

  return (
    <ProtectedRoute>
      <ActionLink
        href="/smart-file"
        ariaLabel="Share Smart File"
        className="group fixed right-4 top-4 z-[60] inline-flex min-h-10 items-center gap-2 overflow-visible rounded-2xl bg-[#0B2D54] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(11,45,84,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#092544] hover:shadow-[0_18px_38px_rgba(11,45,84,0.28),0_0_28px_rgba(36,193,196,0.22)] sm:right-6 sm:top-5"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-[18px] bg-[#24C1C4]/20 opacity-0 blur-xl scale-90 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
        />
        <span className="relative grid h-6 w-6 place-items-center rounded-xl bg-white/8 ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:scale-125 group-hover:bg-[#24C1C4]/18 group-hover:ring-[#24C1C4]/45 group-hover:shadow-[0_0_18px_rgba(36,193,196,0.58)]">
          <FileHeart className="h-3.5 w-3.5 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#24C1C4]" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Share Smart File</span>
        <span className="sm:hidden">Share</span>
      </ActionLink>
      <main className="min-h-screen bg-[#EAF0F7] px-2 pb-2 pt-[72px] text-[#0B2D54] sm:px-4 sm:pb-4 sm:pt-[72px] lg:pl-[104px] lg:pt-4">
        <div className="mx-auto max-w-[1480px] pb-2">
          <section className="min-w-0">
            <div className="px-4 pb-1 pt-3 sm:px-5 lg:px-7">
              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <section id="dashboard-overview-card" className="group relative min-h-[220px] overflow-hidden rounded-[28px] bg-[#0B2D54] p-6 text-white sm:p-7">
                  <div className="relative flex min-h-[166px] items-center justify-between gap-8">
                    <div className="min-w-0 pr-1 sm:pr-10">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">Overview</p>
                        <ActionLink
                          href="/notifications"
                          ariaLabel="Notifications"
                          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20 transition-all hover:-translate-y-0.5 hover:bg-[#24C1C4] hover:text-[#0B2D54]"
                        >
                          <Bell className="h-4 w-4" aria-hidden="true" />
                          {unreadNotificationCount > 0 && (
                            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#24C1C4] px-1 text-[8px] font-black leading-none text-[#0B2D54] ring-2 ring-[#0B2D54]">
                              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                            </span>
                          )}
                        </ActionLink>
                      </div>
                      <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.05em] sm:text-[38px]">
                        {greeting}, {firstName}
                      </h2>
                      <p className="mt-2 max-w-[34rem] text-[11px] font-medium leading-5 text-white/66 sm:text-xs">
                        Your health, organised around what matters today.
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-center text-center sm:min-w-[205px]">
                      <div className="relative grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
                        <span className="absolute inset-0 rounded-full bg-[#24C1C4] shadow-[0_0_42px_rgba(36,193,196,0.58),0_0_80px_rgba(36,193,196,0.28)] animate-pulse" />
                        <span className="relative grid h-full w-full place-items-center rounded-full bg-[#2BD6D3] text-[#0B2D54] shadow-[inset_0_2px_10px_rgba(255,255,255,0.28)]">
                          <span className="text-[54px] font-black leading-none tracking-[-0.08em] sm:text-[62px]">
                            {todayActionCount ?? "—"}
                          </span>
                        </span>
                      </div>
                      <p className="mt-3 max-w-[15rem] text-center text-[11px] font-semibold leading-5 tracking-[-0.01em] text-white/82 sm:text-xs">
                        <span className="font-black text-white">active items</span>
                        <br />
                        need your attention today
                      </p>
                    </div>
                  </div>
                </section>

                <section className="group relative min-h-[210px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#29CFD0] via-[#20BBC0] to-[#0A9DA7] p-5 text-white shadow-[0_24px_60px_rgba(36,193,196,0.20)] ring-1 ring-inset ring-white/25 sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/45 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-[#C9FFFF]/35 blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/75" />

                  <div className="relative">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/14 ring-1 ring-inset ring-white/20">
                        <Activity
                          className="h-5 w-5 text-white/90"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </span>
                      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-white/70">
                        Recent symptom
                      </p>
                    </div>

                    {recentSymptom ? (
                      <div className="mt-5 min-w-0">
                        <h2 className="truncate text-[29px] font-black tracking-[-0.05em] sm:text-[32px]">
                          {symptomLabel(recentSymptom)}
                        </h2>
                        <p className="mt-1 text-[11px] font-semibold text-white/76">
                          {formatSymptomDate(recentSymptomAt)}
                          {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          <Link
                            href={
                              recentSymptomStatus === "ACTIVE"
                                ? "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id)) + "/monitor"
                                : "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id))
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(11,45,84,0.18)] transition-all hover:-translate-y-0.5"
                          >
                            Update
                            <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                          </Link>
                          <Link
                            href="/log-symptom"
                            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.09em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-all hover:bg-white/22"
                          >
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0B2D54] text-white shadow-sm">
                              <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                            </span>
                            New symptom
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <h2 className="text-[27px] font-black tracking-[-0.05em]">Log a symptom</h2>
                        <p className="mt-1 text-[11px] font-semibold text-white/76">Nothing has been logged yet.</p>
                        <Link
                          href="/log-symptom"
                          className="mt-3.5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white"
                        >
                          Log symptom
                          <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0B2D54]/55">Your health</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ActionLink
                    id="dashboard-today-card"
                    href="/today"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#10B7B9] via-[#24C1C4] to-[#79E6E1] p-5 text-white shadow-[0_18px_40px_rgba(36,193,196,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(36,193,196,0.30)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/45" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 text-white ring-1 ring-inset ring-white/25 shadow-[0_8px_22px_rgba(0,70,80,0.12)] transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-[#24C1C4] group-hover:text-[#0B2D54] group-hover:shadow-[0_12px_28px_rgba(36,193,196,0.34)]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Daily care</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Today</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {todayChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-white/16 text-white ring-white/20">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#8E1B1B] via-[#C62828] to-[#F05A5A] p-5 text-white shadow-[0_18px_40px_rgba(198,40,40,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(198,40,40,0.30)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/22 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/35" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-inset ring-white/22 shadow-[0_8px_22px_rgba(80,20,20,0.16)] transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-[#24C1C4] group-hover:text-[#0B2D54] group-hover:shadow-[0_12px_28px_rgba(36,193,196,0.34)]">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Clinic Card</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Essentials</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {clinicChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-white/14 text-white ring-white/18">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0B2D54] via-[#155AC1] to-[#2F6FED] p-5 text-white shadow-[0_18px_40px_rgba(11,45,84,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(11,45,84,0.32)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/22 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/35" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-inset ring-white/22 shadow-[0_8px_22px_rgba(0,20,60,0.16)] transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-[#24C1C4] group-hover:text-[#0B2D54] group-hover:shadow-[0_12px_28px_rgba(36,193,196,0.34)]">
                        <FolderOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Health Journal</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Records</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <RecordedChip className="bg-white/14 text-white ring-white/18">{journalRecordLabel}</RecordedChip>
                          <RecordedChip className="bg-white/14 text-white ring-white/18">{symptomRecordLabel}</RecordedChip>
                        </div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
  }