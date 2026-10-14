"use client";

import Link from "next/link";
import { Activity, ArrowRight, Brain, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";

type Props = {
  goal: any;
  activeGoals?: any[];
  onUpdated?: () => void | Promise<void>;
  patient?: any;
  profile?: any;
  healthPassport?: any;
  medicalRecord?: any;
  conditions?: any[];
  medications?: any[];
  symptoms?: any[];
};

type CheckInEntry = {
  day: string;
  occurredAt: string;
  updatedAt?: string;
  stress: number | null;
  mood: string | null;
  energyLevel: string | null;
  sleepHours: number | null;
  exerciseMinutes: number | null;
  waterIntakeMl: number | null;
  source?: string | null;
};

const DAY_TIME_ZONE = "Africa/Johannesburg";
const INACTIVE_STATUSES = new Set(["RESOLVED", "INACTIVE", "CANCELLED", "ARCHIVED", "DELETED", "DISCONTINUED", "STOPPED", "COMPLETED", "ENDED"]);

function dayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(values.year) + "-" + String(values.month) + "-" + String(values.day);
}

function dayOrdinal(day: string) {
  const parts = day.split("-").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return Number.NaN;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundedStress(value: unknown) {
  const number = numberOrNull(value);
  return number != null && number >= 1 && number <= 10 ? number : null;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatDate(value: unknown, withYear = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

function displayLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const known: Record<string, string> = {
    NEVER: "Never",
    FORMER: "Former",
    OCCASIONAL: "Occasional",
    DAILY: "Daily",
    WEEKLY: "Weekly",
    VERY_BAD: "Very low",
    BAD: "Low",
    NEUTRAL: "Okay",
    GOOD: "Good",
    VERY_GOOD: "Very good",
    VERY_LOW: "Very low",
    LOW: "Low",
    NORMAL: "Normal",
    HIGH: "High",
    VERY_HIGH: "Very high",
    PREFER_NOT_TO_SAY: "Prefer not to say",
    NOT_RECORDED: "Not recorded",
  };
  const upper = text.toUpperCase();
  if (known[upper]) return known[upper];
  return text.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function moodLabel(value: unknown) {
  return displayLabel(value);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function activeRecord(record: any) {
  const status = String(record?.status ?? "").toUpperCase();
  if (INACTIVE_STATUSES.has(status) || record?.resolvedAt || record?.endedAt || record?.discontinuedAt) return false;
  if (record?.ongoing === false || record?.isOngoing === false) return false;
  return true;
}

function conditionName(record: any) {
  return String(record?.name ?? record?.conditionName ?? record?.diagnosisName ?? record?.condition?.name ?? record?.diagnosis?.name ?? "").trim();
}

function medicationName(record: any) {
  return String(record?.medication?.name ?? record?.medication?.genericName ?? record?.genericName ?? record?.name ?? record?.medicationName ?? record?.medication?.brandName ?? "").trim();
}

function labelForCategory(category: string) {
  const labels: Record<string, string> = {
    SLEEP: "Sleep",
    EXERCISE: "Exercise",
    ALCOHOL: "Alcohol",
    SMOKING: "Smoking",
    NUTRITION: "Nutrition",
    HYDRATION: "Hydration",
    MEDICATION: "Medication",
    BLOOD_PRESSURE: "Blood pressure",
    BLOOD_GLUCOSE: "Blood glucose",
    CHOLESTEROL: "Cholesterol",
    HEART_RATE: "Heart rate",
  };
  return labels[category] ?? category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueFromRecords(records: any[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record?.[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
  }
  return null;
}

export default function TodayMentalHealthGoal({
  goal,
  onUpdated,
  patient,
  profile,
  healthPassport,
  medicalRecord,
  conditions = [],
  medications = [],
  symptoms = [],
}: Props) {
  const [entries, setEntries] = useState<CheckInEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const goalId = String(goal?.id ?? "");
  const targetRaw = goal?.targetValue ?? goal?.metricConfig?.frequencyTarget;
  const targetNumber = numberOrNull(targetRaw);
  const target = targetNumber != null && targetNumber >= 1 && targetNumber <= 10 ? targetNumber : null;

  const journey = useMemo(() => {
    const todayOrdinal = dayOrdinal(dayKey(new Date()));
    const startOrdinal = dayOrdinal(dayKey(goal?.createdAt));
    const endOrdinal = goal?.targetDate ? dayOrdinal(dayKey(goal.targetDate)) : Number.NaN;
    return {
      day: Number.isFinite(startOrdinal) ? Math.max(1, todayOrdinal - startOrdinal + 1) : 1,
      daysLeft: Number.isFinite(endOrdinal) ? Math.max(0, endOrdinal - todayOrdinal) : null,
    };
  }, [goal?.createdAt, goal?.targetDate]);

  const loadCheckIns = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [metricResult, journalResult] = await Promise.allSettled([
      healthGoalsService.getMetricEvents("MENTAL_HEALTH", "mental.stress", from, now),
      healthJournalService.getAll({ page: 1, limit: 100 }),
    ]);

    const byDay = new Map<string, CheckInEntry>();
    if (metricResult.status === "fulfilled" && Array.isArray(metricResult.value?.events)) {
      for (const event of metricResult.value.events) {
        const occurredAt = String(event?.occurredAt ?? "");
        const day = dayKey(occurredAt);
        const value = boundedStress(event?.loggedValue);
        const age = dayOrdinal(dayKey(now)) - dayOrdinal(day);
        if (!day || value == null || !Number.isFinite(age) || age < 0 || age > 90) continue;
        const existing = byDay.get(day);
        if (!existing || new Date(occurredAt).getTime() >= new Date(existing.occurredAt).getTime()) {
          byDay.set(day, {
            day,
            occurredAt,
            stress: value,
            mood: null,
            energyLevel: null,
            sleepHours: null,
            exerciseMinutes: null,
            waterIntakeMl: null,
            source: String(event?.source ?? ""),
          });
        }
      }
    }

    const journals = journalResult.status === "fulfilled" && Array.isArray(journalResult.value?.data)
      ? journalResult.value.data
      : [];
    const latestJournalByDay = new Map<string, any>();
    for (const journal of journals) {
      if (String(journal?.title ?? "") !== "Daily Health Check-in") continue;
      const occurredAt = String(journal?.createdAt ?? "");
      const day = dayKey(occurredAt);
      const age = dayOrdinal(dayKey(now)) - dayOrdinal(day);
      if (!day || !Number.isFinite(age) || age < 0 || age > 90) continue;
      const previous = latestJournalByDay.get(day);
      const updatedAt = new Date(String(journal?.updatedAt ?? journal?.createdAt ?? "")).getTime();
      const previousUpdatedAt = new Date(String(previous?.updatedAt ?? previous?.createdAt ?? "")).getTime();
      if (!previous || updatedAt >= previousUpdatedAt) latestJournalByDay.set(day, journal);
    }

    for (const [day, journal] of latestJournalByDay) {
      const occurredAt = String(journal?.createdAt ?? journal?.updatedAt ?? "");
      const priorMetric = byDay.get(day);
      const journalStress = boundedStress(journal?.stressLevel);
      byDay.set(day, {
        day,
        occurredAt,
        updatedAt: String(journal?.updatedAt ?? occurredAt),
        stress: journalStress ?? priorMetric?.stress ?? null,
        mood: journal?.mood ? String(journal.mood) : null,
        energyLevel: journal?.energyLevel ? String(journal.energyLevel) : null,
        sleepHours: numberOrNull(journal?.sleepHours),
        exerciseMinutes: numberOrNull(journal?.exerciseMinutes),
        waterIntakeMl: numberOrNull(journal?.waterIntakeMl),
        source: "Daily Health Check-in",
      });
    }

    setEntries(Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)));
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadCheckIns();
    };
    void refresh();
    const handleUpdated = () => {
      void refresh();
      void Promise.resolve(onUpdated?.());
    };
    const interval = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    window.addEventListener("sympto:today-action-updated", handleUpdated);
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-checkin-updated", handleUpdated);
      window.removeEventListener("sympto:today-action-updated", handleUpdated);
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
    };
  }, [loadCheckIns, onUpdated]);

  const todayKey = dayKey(new Date());
  const todayEntry = entries.find((entry) => entry.day === todayKey) ?? null;
  const todayStress = todayEntry?.stress ?? null;
  const progressPercent = todayStress == null || target == null
    ? 0
    : todayStress <= target
      ? 100
      : Math.max(0, Math.min(100, Math.round((target / todayStress) * 100)));
  const targetMet = todayStress != null && target != null && todayStress <= target;

  const recent = useMemo(() => {
    const todayOrdinal = dayOrdinal(dayKey(new Date()));
    const recentSeven = entries.filter((entry) => {
      const offset = todayOrdinal - dayOrdinal(entry.day);
      return offset >= 0 && offset <= 6 && entry.stress != null;
    });
    const previousSeven = entries.filter((entry) => {
      const offset = todayOrdinal - dayOrdinal(entry.day);
      return offset >= 7 && offset <= 13 && entry.stress != null;
    });
    const recentAverage = mean(recentSeven.map((entry) => Number(entry.stress)));
    const previousAverage = mean(previousSeven.map((entry) => Number(entry.stress)));
    const targetDays = target == null ? null : recentSeven.filter((entry) => Number(entry.stress) <= target).length;
    let trend: "LOWER" | "HIGHER" | "STEADY" | "BUILDING" = "BUILDING";
    let trendTitle = "Building your personal pattern";
    let trendText = "Keep recording your stress score in the Daily Health Check-in. Sympto needs at least 3 recorded days in each 7-day period before comparing weekly averages.";
    if (recentSeven.length >= 3 && previousSeven.length >= 3 && recentAverage != null && previousAverage != null) {
      const delta = recentAverage - previousAverage;
      if (delta <= -0.5) {
        trend = "LOWER";
        trendTitle = "Average stress is lower";
      } else if (delta >= 0.5) {
        trend = "HIGHER";
        trendTitle = "Average stress is higher";
      } else {
        trend = "STEADY";
        trendTitle = "Average stress is similar";
      }
      trendText = delta === 0
        ? "Your recorded 7-day average is about the same as the previous week. This describes your check-ins, not a diagnosis or proof of cause."
        : "Your recorded 7-day average is " + Math.abs(delta).toFixed(1) + " point" + (Math.abs(delta) === 1 ? "" : "s") + (delta < 0 ? " lower" : " higher") + " than the previous week. This describes your check-ins, not a diagnosis or proof of cause.";
    } else {
      trendText = "You have " + recentSeven.length + " recorded " + (recentSeven.length === 1 ? "day" : "days") + " in the latest week and " + previousSeven.length + " in the week before. Keep checking in to build a reliable comparison.";
    }
    return { recentSeven, previousSeven, recentAverage, previousAverage, targetDays, trend, trendTitle, trendText };
  }, [entries, target]);

  const latestWithMood = [...entries].reverse().find((entry) => entry.mood && dayOrdinal(todayKey) - dayOrdinal(entry.day) <= 6) ?? null;
  const recentCheckIns = entries.filter((entry) => {
    const offset = dayOrdinal(todayKey) - dayOrdinal(entry.day);
    return offset >= 0 && offset <= 6;
  });
  const averageSleep = mean(recentCheckIns.map((entry) => entry.sleepHours).filter((value): value is number => value != null && value > 0));
  const averageExercise = mean(recentCheckIns.map((entry) => entry.exerciseMinutes).filter((value): value is number => value != null && value >= 0));
  const averageWater = mean(recentCheckIns.map((entry) => entry.waterIntakeMl).filter((value): value is number => value != null && value >= 0));

  const connectedGoalRelations = useMemo(() => {
    const relations = Array.isArray(goal?.connectedGoals) ? goal.connectedGoals : [];
    const byGoalId = new Map<string, any>();
    for (const relation of relations) {
      const related = relation?.goal;
      const relatedId = String(related?.id ?? "");
      if (!relatedId || relatedId === goalId) continue;
      const previous = byGoalId.get(relatedId);
      const relationType = String(relation?.relationshipType ?? "").toUpperCase();
      const previousType = String(previous?.relationshipType ?? "").toUpperCase();
      if (!previous || (relationType === "SUPPORTS" && previousType !== "SUPPORTS")) byGoalId.set(relatedId, relation);
    }
    return Array.from(byGoalId.values());
  }, [goal?.connectedGoals, goalId]);

  const activeConditions = useMemo(() => {
    const source = conditions.length > 0
      ? conditions
      : Array.isArray(healthPassport?.conditions)
        ? healthPassport.conditions
        : [];
    return source.filter((record) => activeRecord(record) && conditionName(record)).slice(0, 6);
  }, [conditions, healthPassport?.conditions]);

  const activeMedications = useMemo(() => {
    const source = medications.length > 0
      ? medications
      : Array.isArray(healthPassport?.medications)
        ? healthPassport.medications
        : [];
    return source.filter((record) => activeRecord(record) && medicationName(record)).slice(0, 6);
  }, [medications, healthPassport?.medications]);

  const activeSymptoms = useMemo(() => {
    return symptoms.filter((record) => {
      const status = String(record?.status ?? "").toUpperCase();
      return (status === "ACTIVE" || status === "ONGOING") && String(record?.title ?? record?.symptomName ?? record?.name ?? "").trim();
    }).slice(0, 4);
  }, [symptoms]);

  const personalDetails = [
    { label: "Smoking", value: valueFromRecords([patient, profile, healthPassport], ["smokingStatus", "smoking"]) },
    { label: "Alcohol", value: valueFromRecords([patient, profile, healthPassport], ["alcoholConsumption", "alcoholUse"]) },
    { label: "Usual exercise", value: valueFromRecords([patient, profile, healthPassport], ["exerciseFrequency", "physicalActivityFrequency"]) },
  ].filter((item) => item.value != null).map((item) => ({ label: item.label, value: displayLabel(item.value) }));

  const hasAdditionalHistory = ["pastMedicalHistory", "surgicalHistory", "familyHistory", "socialHistory"].some((key) => {
    const value = medicalRecord?.[key] ?? healthPassport?.[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return typeof value === "string" && value.trim().length > 0;
  });

  return (
    <article
      id={"today-goal-" + encodeURIComponent(goalId)}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]"
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]"><Brain className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-[#0b2d54]">Mental health</h3>
            <p className="mt-0.5 text-[10px] font-semibold text-[#7e909d]">Stress and wellbeing · daily</p>
          </div>
        </div>
        <Link href="/health-goals" className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[#dce7eb] bg-white px-2.5 py-1.5 text-[9px] font-black text-[#0b2d54]">
          Goal details <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="flex-1 px-3.5 pb-3.5 sm:px-4">
        <section className="overflow-hidden rounded-[23px] bg-[#0b2d54] p-4 text-white sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.17em] text-white/50">Today's self-reported stress</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[42px] font-black leading-none tracking-[-.06em]">{todayStress == null ? "—" : formatNumber(todayStress, 0)}</span>
                <span className="text-[11px] font-bold text-white/60">/ 10</span>
              </div>
              <p className="mt-2 text-[9px] font-semibold text-white/55">
                {todayEntry ? "Recorded " + formatDate(todayEntry.occurredAt) : "Not recorded today"}
              </p>
            </div>
            <div className="min-w-[112px] rounded-[17px] border border-white/10 bg-white/[0.07] p-3 text-right">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/45">Saved target</p>
              <p className="mt-1 text-2xl font-black leading-none tracking-[-.05em]">{target == null ? "—" : "≤ " + formatNumber(target, 0)}</p>
              <p className="mt-1 text-[9px] font-semibold text-white/50">score out of 10</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/45">Today's goal progress</p>
              <span className="text-[10px] font-black text-[#a5ffff]">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: progressPercent + "%" }} />
            </div>
            <p className="mt-2 text-[9px] leading-4 text-white/60">
              {todayStress == null
                ? "Log today's stress score in the Daily Health Check-in to start today's progress."
                : targetMet
                  ? "Today's recorded score is within your saved target. Keep checking in to build a personal trend."
                  : "Today's score is " + formatNumber(todayStress - (target ?? 0), 0) + " point" + (todayStress - (target ?? 0) === 1 ? "" : "s") + " above your saved target."}
            </p>
          </div>
        </section>

        <section className="mt-3 rounded-[19px] border border-[#e2ecef] bg-[#fbfdfd] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Recent pattern</p>
              <p className="mt-1 text-[10px] font-semibold text-[#758896]">Recorded stress scores · last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#8a99a6]">Average</p>
              <p className="mt-0.5 text-lg font-black tracking-[-.04em] text-[#0b2d54]">{recent.recentAverage == null ? "—" : recent.recentAverage.toFixed(1) + "/10"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] bg-white p-3 ring-1 ring-[#e4edef]">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#82939f]">Days at target</p>
              <p className="mt-1 text-base font-black text-[#0b2d54]">
                {recent.targetDays == null || recent.recentSeven.length === 0 ? "—" : recent.targetDays + " / " + recent.recentSeven.length}
              </p>
            </div>
            <div className="rounded-[14px] bg-white p-3 ring-1 ring-[#e4edef]">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#82939f]">Weekly comparison</p>
              <div className="mt-1 flex items-center gap-1.5">
                {recent.trend === "LOWER"
                  ? <TrendingDown className="h-3.5 w-3.5 text-[#0b7b80]" />
                  : recent.trend === "HIGHER"
                    ? <TrendingUp className="h-3.5 w-3.5 text-[#ad7166]" />
                    : <Activity className="h-3.5 w-3.5 text-[#0b7b80]" />}
                <p className="text-[9px] font-black leading-4 text-[#0b2d54]">{recent.trendTitle}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-[#74859a]">{recent.trendText}</p>
        </section>

        <section className="mt-3 rounded-[19px] border border-[#e2ecef] bg-white p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Alongside your check-ins</p>
              <p className="mt-1 text-[9px] text-[#7a8b98]">Self-reported signals · last 7 days</p>
            </div>
            {loading && <span className="text-[8px] font-semibold text-[#8a99a6]">Updating…</span>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[13px] bg-[#f7fbfb] p-2.5">
              <p className="text-[8px] font-bold text-[#8595a0]">Latest mood</p>
              <p className="mt-1 text-[10px] font-black text-[#0b2d54]">{latestWithMood ? moodLabel(latestWithMood.mood) : "—"}</p>
            </div>
            <div className="rounded-[13px] bg-[#f7fbfb] p-2.5">
              <p className="text-[8px] font-bold text-[#8595a0]">Average sleep</p>
              <p className="mt-1 text-[10px] font-black text-[#0b2d54]">{averageSleep == null ? "—" : averageSleep.toFixed(1) + " h"}</p>
            </div>
            <div className="rounded-[13px] bg-[#f7fbfb] p-2.5">
              <p className="text-[8px] font-bold text-[#8595a0]">Movement / day</p>
              <p className="mt-1 text-[10px] font-black text-[#0b2d54]">{averageExercise == null ? "—" : Math.round(averageExercise) + " min"}</p>
            </div>
            <div className="rounded-[13px] bg-[#f7fbfb] p-2.5">
              <p className="text-[8px] font-bold text-[#8595a0]">Water / day</p>
              <p className="mt-1 text-[10px] font-black text-[#0b2d54]">{averageWater == null ? "—" : Math.round(averageWater).toLocaleString("en-ZA") + " ml"}</p>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-[#74859a]">These entries give personal context only. They do not establish what caused a change in stress or mood.</p>
        </section>

        <section className="mt-3 rounded-[19px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
            <span className="text-[8px] font-bold text-[#9aa8b1]">{connectedGoalRelations.length ? connectedGoalRelations.length + " connected" : "Not connected"}</span>
          </div>
          {connectedGoalRelations.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {connectedGoalRelations.map((relation: any) => {
                const related = relation?.goal;
                const category = String(related?.category ?? "").toUpperCase();
                const isSupports = String(relation?.relationshipType ?? "").toUpperCase() === "SUPPORTS";
                const label = isSupports
                  ? String(relation?.direction ?? "") === "supportsThisGoal" ? "Supports this" : "Supports another"
                  : "Related context";
                return (
                  <Link
                    key={String(relation?.id ?? related?.id ?? category)}
                    href="/today#today-goals"
                    title={String(relation?.rationale ?? "")}
                    className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb] transition hover:border-[#24c1c4]"
                  >
                    <span className="truncate">{labelForCategory(category || "OTHER")}</span>
                    <span className="shrink-0 text-[#91a2ad]">· {label}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[9px] leading-4 text-[#74859a]">Sleep and Exercise are the main supporting goal signals. Existing Alcohol or Smoking goals can appear as related context when you track them.</p>
          )}
        </section>

        <details className="mt-3 rounded-[19px] border border-[#e2ecef] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
            <span>
              <span className="block text-[9px] font-black text-[#0b2d54]">Personal health context</span>
              <span className="mt-0.5 block text-[8px] font-medium text-[#81929f]">
                {activeConditions.length + " conditions · " + activeMedications.length + " medicines" + (activeSymptoms.length ? " · " + activeSymptoms.length + " active symptoms" : "")}
              </span>
            </span>
            <span className="text-[9px] font-black text-[#0b7b80]">View</span>
          </summary>
          <div className="space-y-3 border-t border-[#edf2f4] px-3.5 py-3">
            {personalDetails.length > 0 && (
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#82939f]">Profile</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {personalDetails.map((item) => <span key={item.label} className="rounded-full bg-[#f4f8f9] px-2.5 py-1.5 text-[8px] font-semibold text-[#526779]">{item.label}: {item.value}</span>)}
                </div>
              </div>
            )}
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#82939f]">Active conditions</p>
              {activeConditions.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeConditions.map((item, index) => <span key={String(item.id ?? conditionName(item) ?? index)} className="rounded-full bg-[#f4f8f9] px-2.5 py-1.5 text-[8px] font-semibold text-[#526779]">{conditionName(item)}</span>)}
                </div>
              ) : <p className="mt-1 text-[9px] text-[#81929f]">No active conditions were supplied by your current health records.</p>}
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#82939f]">Current medicines</p>
              {activeMedications.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeMedications.map((item, index) => <span key={String(item.id ?? medicationName(item) ?? index)} className="rounded-full bg-[#f4f8f9] px-2.5 py-1.5 text-[8px] font-semibold text-[#526779]">{medicationName(item)}</span>)}
                </div>
              ) : <p className="mt-1 text-[9px] text-[#81929f]">No current medicines were supplied by your current health records.</p>}
            </div>
            {activeSymptoms.length > 0 && (
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#82939f]">Active symptoms</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeSymptoms.map((item, index) => <span key={String(item.id ?? index)} className="rounded-full bg-[#f4f8f9] px-2.5 py-1.5 text-[8px] font-semibold text-[#526779]">{String(item.title ?? item.symptomName ?? item.name)}</span>)}
                </div>
              </div>
            )}
            {hasAdditionalHistory && <p className="text-[9px] leading-4 text-[#74859a]">Additional medical, family or social history is on file in your Health Passport. It is not interpreted here as a cause of stress.</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/health-passport" className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">Review Health Passport <ArrowRight className="h-3 w-3" /></Link>
              <Link href="/profile" className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">Review profile <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-[9px] leading-4 text-[#74859a]">Your saved information helps you and your care team review context. This goal does not diagnose a mental-health condition or infer that medicines or conditions caused a stress score.</p>
          </div>
        </details>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">
            {todayStress != null
              ? "Today's stress score is saved. Use the check-in if it needs updating."
              : "Record your stress score in the Daily Health Check-in to start today's tracking."}
          </p>
          <Link href="#daily-health-check-in" className="shrink-0 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">
            {todayStress != null ? "Update" : "Check in"}
          </Link>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f4] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8a6]">Journey</p>
          <p className="mt-0.5 text-xs font-black text-[#0b2d54]">Day {journey.day}{journey.daysLeft !== null ? " · " + journey.daysLeft + " days left" : ""}</p>
        </div>
        <Link href={"/health-goals#goal-" + encodeURIComponent(goalId)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">
          View goal <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </article>
  );
}
