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
  const sleepStressPattern = useMemo(() => {
    const cutoff = dayOrdinal(todayKey) - 29;
    const paired = entries.filter((entry) =>
      entry.stress != null &&
      entry.sleepHours != null &&
      entry.sleepHours > 0 &&
      dayOrdinal(entry.day) >= cutoff &&
      dayOrdinal(entry.day) <= dayOrdinal(todayKey),
    );
    const shorterSleep = paired.filter((entry) => Number(entry.sleepHours) < 6);
    const longerSleep = paired.filter((entry) => Number(entry.sleepHours) >= 6);
    if (shorterSleep.length < 3 || longerSleep.length < 3) return null;
    const shorterAverage = mean(shorterSleep.map((entry) => Number(entry.stress)));
    const longerAverage = mean(longerSleep.map((entry) => Number(entry.stress)));
    if (shorterAverage == null || longerAverage == null || Math.abs(shorterAverage - longerAverage) < 1) return null;
    return {
      shorterAverage,
      longerAverage,
      shorterDays: shorterSleep.length,
      longerDays: longerSleep.length,
      direction: shorterAverage > longerAverage ? "HIGHER" as const : "LOWER" as const,
    };
  }, [entries, todayKey]);

  const moodStressPattern = useMemo(() => {
    const cutoff = dayOrdinal(todayKey) - 29;
    const paired = entries.filter((entry) =>
      entry.stress != null &&
      entry.mood &&
      dayOrdinal(entry.day) >= cutoff &&
      dayOrdinal(entry.day) <= dayOrdinal(todayKey),
    );
    const moodScore = (mood: string | null) => ({
      VERY_BAD: 1,
      BAD: 2,
      NEUTRAL: 3,
      GOOD: 4,
      VERY_GOOD: 5,
    } as Record<string, number>)[String(mood ?? "").toUpperCase()] ?? null;
    const lowerMood = paired.filter((entry) => (moodScore(entry.mood) ?? 3) <= 2);
    const neutralOrPositiveMood = paired.filter((entry) => (moodScore(entry.mood) ?? 0) >= 3);
    if (lowerMood.length < 3 || neutralOrPositiveMood.length < 3) return null;
    const lowerMoodAverage = mean(lowerMood.map((entry) => Number(entry.stress)));
    const otherMoodAverage = mean(neutralOrPositiveMood.map((entry) => Number(entry.stress)));
    if (lowerMoodAverage == null || otherMoodAverage == null || Math.abs(lowerMoodAverage - otherMoodAverage) < 1) return null;
    return {
      lowerMoodAverage,
      otherMoodAverage,
      lowerMoodDays: lowerMood.length,
      otherMoodDays: neutralOrPositiveMood.length,
      direction: lowerMoodAverage > otherMoodAverage ? "HIGHER" as const : "LOWER" as const,
    };
  }, [entries, todayKey]);

  const personalRecommendation = useMemo(() => {
    const todayIsMissing = !todayEntry?.stress && todayEntry?.stress !== 0;
    if (recent.recentSeven.length < 3) {
      return {
        title: recent.recentSeven.length === 0 ? "Start building your personal baseline" : "Add a few more check-ins",
        message: "There are " + recent.recentSeven.length + " recorded stress " + (recent.recentSeven.length === 1 ? "day" : "days") + " in the last week. Record your stress score in the Daily Health Check-in on a few more days so Sympto can compare your own patterns rather than offer a generic recommendation.",
        action: "Update check-in",
        href: "#daily-health-check-in",
        evidence: recent.recentSeven.length + " of 7 days",
      };
    }
    if (recent.recentAverage != null && target != null && recent.recentAverage > target) {
      const aboveTargetDays = recent.recentSeven.filter((entry) => Number(entry.stress) > target).length;
      return {
        title: "Your recent scores are above your saved target",
        message: "Stress averaged " + recent.recentAverage.toFixed(1) + "/10 across " + recent.recentSeven.length + " recorded days, and " + aboveTargetDays + " recorded " + (aboveTargetDays === 1 ? "day was" : "days were") + " above your target of " + formatNumber(target, 0) + ". Consider taking a short pause for a grounding or breathing exercise today. If higher stress persists or starts affecting daily life, consider speaking with a healthcare professional.",
        action: todayIsMissing ? "Record today's check-in" : "Review check-in",
        href: "#daily-health-check-in",
        evidence: aboveTargetDays + " of " + recent.recentSeven.length + " days above target",
      };
    }
    if (recent.trend === "HIGHER") {
      return {
        title: "Your recorded stress average has risen",
        message: recent.trendText + " It may help to reflect on what has changed in your routine or workload, and to record anything you choose to share in your health journal. This pattern alone cannot identify a cause.",
        action: "Review check-in",
        href: "#daily-health-check-in",
        evidence: recent.recentSeven.length + " recent days compared",
      };
    }
    return {
      title: recent.trend === "LOWER" ? "Your recent stress scores are trending lower" : "Keep building your personal trend",
      message: recent.trend === "LOWER"
        ? "Your recorded average is lower than the previous week. Continue the routines that feel helpful to you and keep checking in; this is a self-reported trend, not a clinical assessment."
        : "Your recent average is " + (recent.recentAverage == null ? "not available" : recent.recentAverage.toFixed(1) + "/10") + ". Keep logging your own check-ins to see whether that pattern holds over time.",
      action: "Update check-in",
      href: "#daily-health-check-in",
      evidence: recent.recentSeven.length + " recorded days",
    };
  }, [todayEntry, recent, target]);

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
        : Array.isArray(medicalRecord?.conditions)
          ? medicalRecord.conditions
          : [];
    return source.filter((record) => activeRecord(record) && conditionName(record)).slice(0, 6);
  }, [conditions, healthPassport?.conditions, medicalRecord?.conditions]);

  const activeMedications = useMemo(() => {
    const source = medications.length > 0
      ? medications
      : Array.isArray(healthPassport?.medications)
        ? healthPassport.medications
        : Array.isArray(medicalRecord?.medications)
          ? medicalRecord.medications
          : [];
    return source.filter((record) => activeRecord(record) && medicationName(record)).slice(0, 6);
  }, [medications, healthPassport?.medications, medicalRecord?.medications]);

  const activeSymptoms = useMemo(() => {
    return symptoms.filter((record) => {
      const status = String(record?.status ?? "").toUpperCase();
      return (status === "ACTIVE" || status === "ONGOING") && String(record?.title ?? record?.symptomName ?? record?.name ?? "").trim();
    }).slice(0, 4);
  }, [symptoms]);

  const smokingProfile = String(valueFromRecords([patient, profile, healthPassport], ["smokingStatus", "smoking"]) ?? "").trim().toUpperCase();
  const alcoholProfile = String(valueFromRecords([patient, profile, healthPassport], ["alcoholConsumption", "alcoholUse"]) ?? "").trim().toUpperCase();
  const exerciseProfile = String(valueFromRecords([patient, profile, healthPassport], ["exerciseFrequency", "physicalActivityFrequency"]) ?? "").trim().toUpperCase();
  const smokesDaily = /DAILY|EVERY DAY|EVERYDAY/.test(smokingProfile);
  const drinksDaily = /DAILY|EVERY DAY|EVERYDAY/.test(alcoholProfile);
  const noUsualExercise = /^(NONE|NEVER|NO|NO REGULAR EXERCISE|SEDENTARY|NOT ACTIVE|INACTIVE)$/.test(exerciseProfile);

  const profileRecommendation = useMemo(() => {
    const stressNeedsAttention = (target != null && recent.recentAverage != null && recent.recentAverage > target) || recent.trend === "HIGHER";
    const longTermCondition = activeConditions.find((item) => {
      const name = conditionName(item).toLowerCase();
      return item?.chronic === true || item?.isChronic === true || /diabet|hypertension|asthma|heart disease|cardiovascular|epilep|arthritis|kidney disease/.test(name);
    });
    const reportedMedicationEffect = activeMedications.find((item) => {
      const effect = String(item?.sideEffects ?? item?.sideEffect ?? item?.adverseEffects ?? item?.reportedSideEffects ?? "").trim();
      return Boolean(effect) && !["NONE", "NO", "N/A", "NA", "UNKNOWN", "FALSE", "NOT RECORDED"].includes(effect.toUpperCase());
    });
    const ongoingSymptom = activeSymptoms.find((item) => String(item?.title ?? item?.symptomName ?? item?.name ?? "").trim());
    const historyWithDetails = ["pastMedicalHistory", "familyHistory", "socialHistory"].some((key) => {
      const value = medicalRecord?.[key] ?? healthPassport?.[key];
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return typeof value === "string" && value.trim().length > 0;
    });

    if (stressNeedsAttention && (longTermCondition || ongoingSymptom)) {
      const condition = longTermCondition ? conditionName(longTermCondition) : "";
      const symptom = ongoingSymptom ? String(ongoingSymptom?.title ?? ongoingSymptom?.symptomName ?? ongoingSymptom?.name ?? "").trim() : "";
      const context = [condition ? "Your Health Passport records " + condition : "", symptom ? "your health records still mark " + symptom + " as active" : ""].filter(Boolean).join(", and ");
      return {
        title: "Bring the relevant health context into your review",
        message: context + ". If managing this condition or symptom is part of the mental load on higher-stress days, note that in your Health Journal and discuss recurring stress with your care team. This is context to review, not proof of what caused the score.",
        basis: "Recent stress pattern + your health records",
        action: "Open Health Journal",
        href: "/health-journal",
      };
    }

    if (reportedMedicationEffect) {
      return {
        title: "Review the timing with your care team",
        message: "A possible medicine effect is already recorded in your health information. If it overlaps with changes in mood or stress, note when it happens and discuss it with the prescriber or pharmacist. Do not stop or change a medicine based on this goal.",
        basis: "Existing medication note + wellbeing check-ins",
        action: "Review Health Journal",
        href: "/health-journal",
      };
    }

    if (smokesDaily && drinksDaily && noUsualExercise) {
      const condition = longTermCondition ? conditionName(longTermCondition) : "";
      return {
        title: "Explore one small change, not a full reset",
        message: "Your profile records daily smoking and alcohol use, but no usual exercise routine. Those details do not explain your stress on their own. For a week, log your score and one short note about what was happening before higher-stress moments. If movement is suitable for you, try a comfortable five-minute walk or stretch on one day and record how you feel before and after. " + (condition ? "If managing " + condition + " is part of today's mental load, note that too. " : "") + "Sympto will look for repeated patterns, not assume cause and effect.",
        basis: "Lifestyle profile + Health Passport + stress check-ins",
        action: "Update check-in",
        href: "#daily-health-check-in",
      };
    }

    if (smokesDaily && drinksDaily) {
      return {
        title: "Look for your own pattern, one day at a time",
        message: "Your profile records daily smoking and alcohol use. That alone does not tell us whether either is related to your stress. For a week, log your score and—only if useful to you—note what was happening around a difficult moment, including timing. Sympto can compare repeated check-ins without assuming cause and effect.",
        basis: "Saved lifestyle profile + stress check-ins",
        action: "Update check-in",
        href: "#daily-health-check-in",
      };
    }

    if (noUsualExercise) {
      return {
        title: "Choose a small, realistic reset",
        message: "Your profile does not list a usual exercise routine, so start with observation rather than a demanding target. If movement is suitable for you, try a comfortable five-minute walk or stretch on one day and record your stress before and after. Repeat on other days before deciding whether it helps you personally.",
        basis: "Saved activity profile + stress check-ins",
        action: "Update check-in",
        href: "#daily-health-check-in",
      };
    }

    if (smokesDaily || drinksDaily) {
      const habit = smokesDaily ? "smoking" : "alcohol use";
      return {
        title: "Track timing before drawing conclusions",
        message: "Your profile records daily " + habit + ". Profile information cannot tell us whether it affects your stress. If you want to explore this, note timing alongside your daily score for several days; discuss any concerns or possible changes with a healthcare professional.",
        basis: "Saved lifestyle profile + stress check-ins",
        action: "Update check-in",
        href: "#daily-health-check-in",
      };
    }

    if (longTermCondition) {
      return {
        title: "Include your wider health in the picture",
        message: "Your Health Passport records " + conditionName(longTermCondition) + ". If day-to-day health management is on your mind, add a note to your Health Journal when you check in. That gives you and your care team more context without assuming your condition explains a stress score.",
        basis: "Health Passport + daily check-ins",
        action: "Open Health Journal",
        href: "/health-journal",
      };
    }

    if (historyWithDetails) {
      return {
        title: "Use your history when it feels relevant",
        message: "Your Health Passport includes additional medical, family or social history. If a detail from that history feels relevant on a higher-stress day, you can add a private note in your Health Journal and review repeated patterns with your care team. Sympto does not infer a cause from stored history.",
        basis: "Health Passport + self-reported check-ins",
        action: "Open Health Journal",
        href: "/health-journal",
      };
    }

    return {
      title: "Build a useful personal baseline",
      message: "There is not enough repeated personal data to identify what tends to accompany your stress yet. Keep recording stress, mood and sleep across several days; if you choose, add a brief note about what was happening on higher-stress days. Recommendations can become more specific as your own patterns emerge.",
      basis: "Repeated self-reported check-ins",
      action: "Update check-in",
      href: "#daily-health-check-in",
    };
  }, [activeConditions, activeMedications, activeSymptoms, drinksDaily, healthPassport, medicalRecord, noUsualExercise, recent.recentAverage, recent.trend, smokesDaily, target]);

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

        <section className="mt-3 rounded-[19px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Your next step</p>
              <h4 className="mt-1 text-[12px] font-black text-[#0b2d54]">{personalRecommendation.title}</h4>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb]">{personalRecommendation.evidence}</span>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-[#526779]">{personalRecommendation.message}</p>
          {sleepStressPattern && (
            <div className="mt-3 rounded-[14px] border border-[#e3ecef] bg-white p-3">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">A pattern in your own check-ins</p>
              <p className="mt-1 text-[10px] leading-5 text-[#526779]">
                Across the last 30 days, stress averaged {sleepStressPattern.shorterAverage.toFixed(1)}/10 on {sleepStressPattern.shorterDays} recorded days with under 6 hours of sleep and {sleepStressPattern.longerAverage.toFixed(1)}/10 on {sleepStressPattern.longerDays} days with 6 or more hours.
                {sleepStressPattern.direction === "HIGHER"
                  ? " Higher stress scores appeared more often on the shorter-sleep days in this sample."
                  : " Higher stress scores did not appear more often on the shorter-sleep days in this sample."}
                {" "}This is an observed overlap in your records, not proof that sleep caused the stress scores.
              </p>
            </div>
          )}
          {moodStressPattern && (
            <div className="mt-3 rounded-[14px] border border-[#e3ecef] bg-white p-3">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Mood and stress recorded together</p>
              <p className="mt-1 text-[10px] leading-5 text-[#526779]">
                Stress averaged {moodStressPattern.lowerMoodAverage.toFixed(1)}/10 on {moodStressPattern.lowerMoodDays} check-in days when you selected a low mood, compared with {moodStressPattern.otherMoodAverage.toFixed(1)}/10 on {moodStressPattern.otherMoodDays} days when you selected okay or better.
                {" "}This describes what you recorded and does not establish a cause or diagnosis.
              </p>
            </div>
          )}
          <Link href={personalRecommendation.href} className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">
            {personalRecommendation.action} <ArrowRight className="h-3 w-3 text-[#24c1c4]" />
          </Link>
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

        <section className="mt-3 rounded-[19px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Personalised guidance</p>
              <h4 className="mt-1 text-[12px] font-black text-[#0b2d54]">{profileRecommendation.title}</h4>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb]">Based on your records</span>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-[#526779]">{profileRecommendation.message}</p>
          <p className="mt-2 text-[8px] font-semibold text-[#8a99a6]">{profileRecommendation.basis}</p>
          <Link href={profileRecommendation.href} className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">
            {profileRecommendation.action} <ArrowRight className="h-3 w-3 text-[#24c1c4]" />
          </Link>
        </section>

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
