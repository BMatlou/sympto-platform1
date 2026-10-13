"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Clock3, Droplets, Plus } from "lucide-react";
import { toast } from "sonner";
import { healthGoalsService, type HealthGoalMetricEventsResponse } from "@/services/health-goals.service";

type Props = { goal: any; onUpdated?: () => Promise<void> | void; conditions?: any[]; diagnoses?: any[]; medications?: any[]; activeGoals?: any[]; labOrders?: any[] };
type GlucoseContext = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL_2H" | "BEDTIME" | "OVERNIGHT" | "OTHER";
type GlucoseEvent = {
  id: string;
  loggedValue: number;
  occurredAt: string;
  source: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const CONTEXTS: Array<{ value: GlucoseContext; label: string }> = [
  { value: "FASTING", label: "Fasting" },
  { value: "BEFORE_MEAL", label: "Before a meal" },
  { value: "AFTER_MEAL_2H", label: "About 2 hours after a meal" },
  { value: "BEDTIME", label: "Bedtime" },
  { value: "OVERNIGHT", label: "Overnight" },
  { value: "OTHER", label: "Other / not specified" },
];

function localDayKey(value: unknown = new Date()) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(values.year) + "-" + String(values.month) + "-" + String(values.day);
}

function localDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
    + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value: unknown, withTime = false) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en-ZA", withTime
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function dayOffset(fromKey: string, toKey: string) {
  if (!fromKey || !toKey) return null;
  const parse = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(toKey) - parse(fromKey)) / 86400000);
}

function contextLabel(event: GlucoseEvent) {
  const value = String(event.metadata?.readingContext ?? event.metadata?.glucoseContext ?? "");
  return CONTEXTS.find((item) => item.value === value)?.label
    ?? (value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Context not recorded");
}

function sourceLabel(event: GlucoseEvent) {
  if (event.source === "wearable" || event.source.startsWith("wearable")) return "Connected device";
  if (event.source === "lab-result" || event.source === "clinical-vital") return "Clinical record";
  if (event.source === "patient-baseline" || event.source === "goal-baseline") return "Baseline";
  return "Manual entry";
}

function isBaseline(event: GlucoseEvent) {
  return event.source === "patient-baseline" || event.source === "goal-baseline";
}

function targetFromGoal(goal: any): number | null {
  const raw = goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue;
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normaliseContextText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function activeRecord(record: any) {
  const status = String(record?.status ?? "ACTIVE").toUpperCase();
  return !["INACTIVE", "RESOLVED", "ENDED", "DISCONTINUED", "CANCELLED", "DELETED", "ARCHIVED"].includes(status)
    && !record?.resolvedAt
    && !record?.endedAt;
}

function namedCondition(record: any) {
  return normaliseContextText(
    record?.condition?.name ??
    record?.diagnosis?.name ??
    record?.diagnosis?.description ??
    record?.name ??
    record?.title,
  );
}

function isPrediabetesRecord(record: any) {
  return /pre diabetes|prediabetes/.test(namedCondition(record));
}

function isDiabetesRecord(record: any) {
  const name = namedCondition(record);
  if (!name || isPrediabetesRecord(record)) return false;
  return /\bdiabetes\b|\bdiabetic\b|type 1 diabetes|type 2 diabetes|gestational diabetes/.test(name);
}

function recordDisplayName(record: any) {
  return String(
    record?.condition?.name ??
    record?.diagnosis?.name ??
    record?.diagnosis?.description ??
    record?.name ??
    record?.title ??
    "Health condition",
  );
}

function medicationDisplayName(record: any) {
  return String(record?.medication?.name ?? record?.medication?.genericName ?? record?.name ?? record?.genericName ?? "Medication");
}

function medicationHasExplicitGlucoseIndication(record: any) {
  const indication = normaliseContextText(record?.indication ?? record?.reason);
  return /diabetes|diabetic|blood glucose|blood sugar|glyc(a|e)emic|prediabetes/.test(indication);
}

function medicationNameSuggestsGlucoseTherapy(record: any) {
  const name = normaliseContextText(medicationDisplayName(record));
  return [
    "metformin", "insulin", "gliclazide", "glimepiride", "glipizide", "glibenclamide",
    "glyburide", "sitagliptin", "linagliptin", "saxagliptin", "vildagliptin",
    "empagliflozin", "dapagliflozin", "canagliflozin", "ertugliflozin",
    "pioglitazone", "repaglinide", "nateglinide", "liraglutide", "semaglutide",
    "dulaglutide", "exenatide",
  ].some((medicine) => name.includes(medicine));
}

type ReleasedLabMeasure = {
  testName: string;
  value: string;
  unit: string;
  occurredAt: string;
  status: string;
  laboratoryName: string;
};

function latestReleasedLabMeasure(labOrders: any[], matcher: RegExp): ReleasedLabMeasure | null {
  const measures: ReleasedLabMeasure[] = [];
  for (const order of Array.isArray(labOrders) ? labOrders : []) {
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    for (const orderItem of orderItems) {
      const results = Array.isArray(orderItem?.labResults) ? orderItem.labResults : [];
      for (const result of results) {
        const status = String(result?.status ?? "").toUpperCase();
        const finalized = ["RELEASED", "VERIFIED", "AMENDED"].includes(status)
          || Boolean(result?.releasedAt || result?.reportedAt);
        if (!finalized || status === "CANCELLED") continue;
        const resultItems = Array.isArray(result?.items) ? result.items : [];
        for (const item of resultItems) {
          const test = item?.test ?? orderItem?.test ?? {};
          const testName = String(test?.name ?? test?.shortName ?? test?.code ?? "");
          if (!testName || !matcher.test(testName)) continue;
          const rawValue = item?.numericValue ?? item?.textValue;
          if (rawValue == null || String(rawValue).trim() === "") continue;
          const date = result?.releasedAt ?? result?.reportedAt ?? result?.createdAt;
          measures.push({
            testName,
            value: String(rawValue),
            unit: String(test?.unit?.symbol ?? test?.unit?.name ?? ""),
            occurredAt: String(date ?? ""),
            status,
            laboratoryName: String(order?.laboratory?.name ?? ""),
          });
        }
      }
    }
  }
  measures.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return measures[0] ?? null;
}

export default function TodayBloodGlucoseGoal({ goal, onUpdated, conditions = [], diagnoses = [], medications = [], activeGoals = [], labOrders = [] }: Props) {
  const goalId = String(goal?.id ?? "");
  const target = targetFromGoal(goal);
  const [events, setEvents] = useState<GlucoseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState("");
  const [readingContext, setReadingContext] = useState<GlucoseContext | "">("");
  const [note, setNote] = useState("");
  const [measurementTime, setMeasurementTime] = useState(() => localDateTimeInput(new Date()));

  const journey = useMemo(() => {
    const today = localDayKey(new Date());
    const created = localDayKey(goal?.createdAt);
    const targetDay = goal?.targetDate ? localDayKey(goal.targetDate) : "";
    const elapsed = dayOffset(created, today);
    const remaining = dayOffset(today, targetDay);
    return {
      day: elapsed == null ? 1 : Math.max(1, elapsed + 1),
      daysLeft: remaining == null ? null : Math.max(0, remaining),
    };
  }, [goal?.createdAt, goal?.targetDate]);

  const loadEvents = useCallback(async () => {
    if (!goalId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 86400000);
      const response: HealthGoalMetricEventsResponse = await healthGoalsService.getMetricEvents(
        "BLOOD_GLUCOSE", "blood_glucose.value", from, to,
      );
      const loaded = (Array.isArray(response?.events) ? response.events : [])
        .map((event) => ({
          id: String(event.id),
          loggedValue: Number(event.loggedValue),
          occurredAt: String(event.occurredAt),
          source: String(event.source ?? ""),
          sourceId: event.sourceId == null ? null : String(event.sourceId),
          metadata: event.metadata ?? null,
        }))
        .filter((event) => Number.isFinite(event.loggedValue) && event.loggedValue > 0 && !isBaseline(event))
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
      setEvents(loaded);
    } catch {
      toast.error("Glucose history could not be refreshed.", { id: "glucose-history-" + goalId });
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void loadEvents();
    const refresh = () => void loadEvents();
    window.addEventListener("sympto:health-goal-updated", refresh);
    window.addEventListener("sympto:today-action-updated", refresh);
    const interval = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("sympto:health-goal-updated", refresh);
      window.removeEventListener("sympto:today-action-updated", refresh);
      window.clearInterval(interval);
    };
  }, [loadEvents]);

  const latest = events[0] ?? null;
  const todayKey = localDayKey(new Date());
  const todaysEvents = events.filter((event) => localDayKey(event.occurredAt) === todayKey);
  // Show a prominent low-reading alert only while the measurement is recent;
  // older low readings remain visible in the history without looking like a
  // current emergency banner.
  const latestAgeMs = latest ? Date.now() - new Date(latest.occurredAt).getTime() : Number.POSITIVE_INFINITY;
  const latestIsRecent = Number.isFinite(latestAgeMs) && latestAgeMs >= 0 && latestAgeMs <= 24 * 60 * 60 * 1000;
  const low = latestIsRecent && latest != null && latest.loggedValue < 3.9;
  const veryLow = latestIsRecent && latest != null && latest.loggedValue < 3.0;
  const targetLinked = Boolean(goal?.practitionerId || goal?.carePlanId);
  const hasEntryContext = latest != null && Boolean(String(latest.metadata?.readingContext ?? latest.metadata?.glucoseContext ?? ""));
  const currentConditions = conditions.filter(activeRecord);
  const currentClinicalDiagnoses = diagnoses.filter(activeRecord);
  const diabetesDiagnosis = currentClinicalDiagnoses.find(isDiabetesRecord);
  const diabetesCondition = currentConditions.find(isDiabetesRecord);
  const prediabetesDiagnosis = currentClinicalDiagnoses.find(isPrediabetesRecord);
  const prediabetesCondition = currentConditions.find(isPrediabetesRecord);
  const diabetesRecord = diabetesDiagnosis ?? diabetesCondition;
  const prediabetesRecord = prediabetesDiagnosis ?? prediabetesCondition;
  const diabetesStatusLabel = diabetesRecord
    ? "Diabetes recorded"
    : prediabetesRecord
      ? "Prediabetes recorded"
      : "No diabetes diagnosis recorded";
  const diabetesStatusDetail = diabetesDiagnosis
    ? "Found in practitioner diagnosis records · " + recordDisplayName(diabetesDiagnosis)
    : diabetesCondition
      ? (diabetesCondition.diagnosedBy || diabetesCondition.treatmentPlan ? "Clinician-recorded health condition · " : "Health condition record · ") + recordDisplayName(diabetesCondition)
      : prediabetesDiagnosis
        ? "Found in practitioner diagnosis records · " + recordDisplayName(prediabetesDiagnosis)
        : prediabetesCondition
          ? "Prediabetes is recorded in Health Conditions · " + recordDisplayName(prediabetesCondition)
          : "No matching entry was found in the current records; this does not rule out diabetes.";

  const activeMedicationRecords = medications.filter(activeRecord);
  const glucoseMedicationRecords = activeMedicationRecords.filter(
    (medication) => medicationHasExplicitGlucoseIndication(medication) || medicationNameSuggestsGlucoseTherapy(medication),
  );
  const linkedGoalCandidates = [
    ...(Array.isArray(goal?.connectedGoals) ? goal.connectedGoals.map((relation: any) => relation?.goal ?? relation) : []),
    ...activeGoals,
  ];
  const connectedGoalMap = new Map<string, any>();
  for (const related of linkedGoalCandidates) {
    const relatedId = String(related?.id ?? "");
    const category = String(related?.category ?? "").toUpperCase();
    const status = String(related?.status ?? "ACTIVE").toUpperCase();
    if (!relatedId || relatedId === goalId || !["MEDICATION", "NUTRITION", "EXERCISE", "SLEEP", "WEIGHT", "BLOOD_PRESSURE"].includes(category)) continue;
    if (!["ACTIVE", "IN_PROGRESS", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"].includes(status)) continue;
    if (category === "MEDICATION") {
      const medicationId = String(related?.patientMedicationId ?? related?.patientMedication?.id ?? "");
      const linkedMedication = activeMedicationRecords.find((item: any) => String(item?.patientMedicationId ?? item?.id ?? "") === medicationId);
      const goalText = normaliseContextText(String(related?.title ?? "") + " " + String(related?.description ?? ""));
      const relevantByMedication = linkedMedication && (medicationHasExplicitGlucoseIndication(linkedMedication) || medicationNameSuggestsGlucoseTherapy(linkedMedication));
      const relevantByGoalText = /diabetes|glucose|insulin|metformin|gliclazide|glimepiride|sitagliptin|empagliflozin|dapagliflozin/.test(goalText);
      if (!relevantByMedication && !relevantByGoalText) continue;
    }
    if (!connectedGoalMap.has(relatedId)) connectedGoalMap.set(relatedId, related);
  }
  const relevantGoals = Array.from(connectedGoalMap.values()).slice(0, 4);
  const latestHba1c = latestReleasedLabMeasure(
    labOrders,
    /(hba1c|hemoglobin a1c|haemoglobin a1c|glycated haemoglobin|glycated hemoglobin|glycosylated hemoglobin)/i,
  );
  const latestLabGlucose = latestReleasedLabMeasure(
    labOrders,
    /^(?!.*(?:hba1c|hemoglobin a1c|haemoglobin a1c|glycated haemoglobin|glycated hemoglobin|glycosylated hemoglobin)).*(?:blood glucose|plasma glucose|fasting glucose|random glucose|glucose tolerance|glucose)$/i,
  );

  async function saveReading() {
    const numeric = Number(value.trim());
    if (!value.trim() || !Number.isFinite(numeric) || numeric <= 0 || numeric > 50) {
      toast.error("Enter a glucose reading greater than 0 and no more than 50 mmol/L.");
      return;
    }
    if (!readingContext) {
      toast.error("Choose when the glucose reading was taken.");
      return;
    }
    if (!goalId) return;

    setSaving(true);
    try {
      const occurredAt = new Date(measurementTime);
      if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
        toast.error("Choose a valid measurement time that is not in the future.");
        return;
      }
      const savedAt = occurredAt.toISOString();
      const sourceId = "glucose-" + goalId + "-" + Date.now();
      await healthGoalsService.syncMetricEvent({
        metricType: "BLOOD_GLUCOSE",
        metricKey: "blood_glucose.value",
        loggedValue: numeric,
        occurredAt: savedAt,
        source: "patient-glucose-log",
        sourceId,
        metadata: {
          kind: "blood-glucose-reading",
          readingContext,
          unit: "mmol/L",
          note: note.trim() || null,
          enteredFrom: "today-blood-glucose-goal",
        },
      });
      setEvents((current) => [
        {
          id: sourceId,
          loggedValue: numeric,
          occurredAt: savedAt,
          source: "patient-glucose-log",
          sourceId,
          metadata: { kind: "blood-glucose-reading", readingContext, unit: "mmol/L", note: note.trim() || null },
        },
        ...current.filter((event) => event.sourceId !== sourceId),
      ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()));
      setValue("");
      setNote("");
      setReadingContext("");
      setOpen(false);
      setShowHistory(true);
      window.dispatchEvent(new Event("sympto:health-goal-updated"));
      toast.success("Glucose reading saved.");
      await onUpdated?.();
      void loadEvents();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(" ") : String(message || "We could not save this glucose reading."));
    } finally {
      setSaving(false);
    }
  }

  const ringSize = 96;
  const ringStroke = 8;
  const radius = (ringSize - ringStroke) / 2;

  return (
    <article id={"today-goal-" + goalId} className="flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d3efed]"><Droplets className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title || "Blood glucose")}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#8a99a6]">Glucose monitoring · mmol/L</p>
          </div>
        </div>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black " + (loading ? "bg-[#eef5f6] text-[#71879b]" : veryLow ? "bg-red-100 text-red-800" : low ? "bg-amber-100 text-amber-900" : latest ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#eef5f6] text-[#71879b]")}>
          {loading ? "Loading" : veryLow ? "Very low reading" : low ? "Low reading" : latest ? "Reading recorded" : "Not recorded"}
        </span>
      </header>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <section className="relative overflow-hidden rounded-[23px] bg-[#0b2d54] px-4 py-3.5 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:px-5 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#24c1c4]/20 blur-2xl" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="relative grid shrink-0 place-items-center rounded-full" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} viewBox={"0 0 " + ringSize + " " + ringSize} className="-rotate-90" aria-hidden="true">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={ringStroke} />
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth={ringStroke} />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <Activity className={"mx-auto mb-1 h-4 w-4 " + (veryLow ? "text-red-200" : low ? "text-amber-200" : "text-[#75e3e3]")} />
                  <p className="text-[25px] font-black leading-none tracking-[-.06em]">{loading ? "—" : formatNumber(latest?.loggedValue)}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-white/45">mmol/L</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Latest reading</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{latest ? formatNumber(latest.loggedValue) : "—"}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{latest ? formatDate(latest.occurredAt, true) : "No readings yet"}</p>
                </div>
                <div className="border-l border-white/10 pl-3 sm:pl-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Readings today</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{todaysEvents.length}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{latest && localDayKey(latest.occurredAt) === todayKey ? contextLabel(latest) : "Log to build your history"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[9px] font-black text-[#b8ffff] ring-1 ring-white/10">{target == null ? "No target set" : "Saved target · " + formatNumber(target) + " mmol/L"}</span>
                <span className="truncate text-[9px] font-semibold text-white/60">{target == null ? "Personal target optional" : targetLinked ? "Provider-linked goal" : "Confirm target with clinician"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Health context</p>
              <p className="mt-1 text-xs font-black text-[#0b2d54]">{diabetesStatusLabel}</p>
              <p className="mt-1 text-[9px] leading-4 text-[#74859a]">{diabetesStatusDetail}</p>
            </div>
            <Link href="/health-conditions" className="shrink-0 rounded-lg border border-[#d6e4e7] bg-white px-2.5 py-1.5 text-[8px] font-black text-[#0b2d54]">Health record <ArrowRight className="ml-1 inline h-2.5 w-2.5" /></Link>
          </div>

          <div className="mt-3 border-t border-[#e8eff1] pt-3">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Medication context</p>
            {glucoseMedicationRecords.length > 0 ? (
              <div className="mt-1.5 space-y-1.5">
                {glucoseMedicationRecords.slice(0, 3).map((medication: any, index: number) => {
                  const explicitIndication = medicationHasExplicitGlucoseIndication(medication);
                  const indication = String(medication?.indication ?? medication?.reason ?? "").trim();
                  const details = [medication?.dosage, medication?.frequency].filter(Boolean).join(" · ");
                  return (
                    <div key={String(medication?.patientMedicationId ?? medication?.id ?? index)} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#0b2d54]">{medicationDisplayName(medication)}{details ? " · " + details : ""}</p>
                        <p className="mt-0.5 text-[9px] leading-4 text-[#74859a]">{indication ? "Indication on record: " + indication : "Indication not recorded"}</p>
                      </div>
                      <span className={"shrink-0 rounded-full px-2 py-1 text-[8px] font-black " + (explicitIndication ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#eef5f6] text-[#71879b]")}>{explicitIndication ? "Indication linked" : "Check indication"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1.5 text-[9px] leading-4 text-[#74859a]">No glucose-related medicine was identified in the active medication list. Keep the list and each medicine’s indication up to date.</p>
            )}
            {glucoseMedicationRecords.some((medication: any) => !medicationHasExplicitGlucoseIndication(medication)) && (
              <p className="mt-2 text-[8px] leading-4 text-[#8a99a6]">A medicine name alone does not confirm diabetes or the reason it was prescribed.</p>
            )}
          </div>

          <div className="mt-3 border-t border-[#e8eff1] pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Latest laboratory results</p>
              <Link href="/tests-results" className="text-[8px] font-black text-[#0b7b80]">Tests & results <ArrowRight className="ml-1 inline h-2.5 w-2.5" /></Link>
            </div>
            {latestHba1c || latestLabGlucose ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {latestHba1c && (
                  <div className="rounded-xl border border-[#e1eaed] bg-white p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#8a99a6]">HbA1c · longer-term marker</p>
                    <p className="mt-1 text-sm font-black text-[#0b2d54]">{latestHba1c.value}{latestHba1c.unit ? " " + latestHba1c.unit : ""}</p>
                    <p className="mt-1 text-[8px] leading-4 text-[#74859a]">{formatDate(latestHba1c.occurredAt)}{latestHba1c.laboratoryName ? " · " + latestHba1c.laboratoryName : ""}</p>
                  </div>
                )}
                {latestLabGlucose && (
                  <div className="rounded-xl border border-[#e1eaed] bg-white p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#8a99a6]">Laboratory glucose</p>
                    <p className="mt-1 text-sm font-black text-[#0b2d54]">{latestLabGlucose.value}{latestLabGlucose.unit ? " " + latestLabGlucose.unit : ""}</p>
                    <p className="mt-1 text-[8px] leading-4 text-[#74859a]">{formatDate(latestLabGlucose.occurredAt)}{latestLabGlucose.laboratoryName ? " · " + latestLabGlucose.laboratoryName : ""}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-[9px] leading-4 text-[#74859a]">No released HbA1c or glucose laboratory result was found in the recent test record.</p>
            )}
            <p className="mt-2 text-[8px] leading-4 text-[#8a99a6]">HbA1c is a different measure from an individual finger-stick or sensor reading; the results are shown separately and are not combined into a single score.</p>
          </div>

          <div className="mt-3 border-t border-[#e8eff1] pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Relevant health goals</p>
              <Link href="/health-goals" className="text-[8px] font-black text-[#0b7b80]">Manage goals <ArrowRight className="ml-1 inline h-2.5 w-2.5" /></Link>
            </div>
            {relevantGoals.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {relevantGoals.map((related: any) => (
                  <Link key={String(related.id)} href={"/health-goals#goal-" + encodeURIComponent(String(related.id))} title={String(related?.description ?? "")} className="rounded-full border border-[#dce8eb] bg-white px-2.5 py-1.5 text-[9px] font-bold text-[#0b2d54]">
                    {String(related?.title ?? related?.category ?? "Health goal")}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[9px] leading-4 text-[#74859a]">Nutrition, activity and medication-adherence goals can provide useful context when they are part of your plan.</p>
            )}
          </div>
          <p className="mt-3 text-[8px] leading-4 text-[#8a99a6]">These records provide context, not a diagnosis or proof that a medicine or behaviour caused a glucose change.</p>
        </section>

        {(low || veryLow) && latest && (
          <div role="alert" className={"mt-3 rounded-[16px] border px-3 py-3 text-[10px] leading-5 " + (veryLow ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-950")}>
            <p className="font-black">{veryLow ? "Very low glucose reading" : "Low glucose reading"}</p>
            <p className="mt-1">This reading is below 3.9 mmol/L. Follow your clinician-provided hypoglycaemia action plan. Seek urgent assistance if symptoms are severe or you cannot treat the low safely yourself.</p>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Clinical target status</p>
            <p className="mt-1 text-sm font-black text-[#0b2d54]">{target == null ? "Tracking only" : "Needs context review"}</p>
            <p className="mt-1 text-[9px] leading-4 text-[#74859a]">{target == null ? "You can record readings while you confirm a personal target." : "A single ceiling cannot interpret fasting, pre-meal and post-meal readings alike."}</p>
          </div>
          <div className="rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#8a99a6]">Reading context</p>
            <p className="mt-1 text-sm font-black text-[#0b2d54]">{latest ? contextLabel(latest) : "Not recorded yet"}</p>
            <p className="mt-1 text-[9px] leading-4 text-[#74859a]">{latest ? sourceLabel(latest) + " · " + (hasEntryContext ? "context saved" : "context not recorded") : "Choose when you take each reading to make history more useful."}</p>
          </div>
        </div>

        {open && (
          <section className="mt-3 rounded-[18px] border border-[#e1ecee] bg-[#f8fbfb] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">New measurement</p>
                <p className="mt-1 text-sm font-black text-[#0b2d54]">Record blood glucose</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-[#74859a]">mmol/L</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Glucose reading</span>
                <input aria-label="Glucose reading in mmol/L" type="number" min="0.1" max="50" step="0.1" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. 6.4" className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">When was it taken?</span>
                <select value={readingContext} onChange={(event) => setReadingContext(event.target.value as GlucoseContext | "")} className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]">
                  <option value="">Choose context</option>
                  {CONTEXTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Measurement date and time</span>
                <input type="datetime-local" value={measurementTime} onChange={(event) => setMeasurementTime(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Note (optional)</span>
                <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Meal, symptoms, activity or anything you want to remember" className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-semibold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#74859a]">Record the value from your meter or clinical result. Sympto stores your reading; it does not diagnose diabetes or change your medication.</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-xl border border-[#d7e4e8] bg-white px-3.5 text-[9px] font-black text-[#74859a]">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveReading()} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 text-[9px] font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save reading"}</button>
            </div>
          </section>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">{latest ? "Your glucose history keeps each reading and its context. The saved target is not used to score a reading until a context-specific range is confirmed." : "Start by recording a measured value and when it was taken. You can track readings while arranging a target review."}</p>
          <button type="button" onClick={() => { setOpen((current) => !current); if (!open) { setMeasurementTime(localDateTimeInput(new Date())); setReadingContext(""); } }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white"><Plus className="h-3 w-3" />{open ? "Close" : "Record"}</button>
        </div>

        <section className="mt-3 overflow-hidden rounded-[18px] border border-[#e2ecef]">
          <button type="button" onClick={() => setShowHistory((current) => !current)} className="flex min-h-10 w-full items-center justify-between gap-3 bg-[#fbfdfd] px-3 py-2.5 text-left">
            <span className="inline-flex items-center gap-2 text-[9px] font-black text-[#0b2d54]"><Clock3 className="h-3.5 w-3.5 text-[#0b7b80]" />Recent readings <span className="rounded-full bg-[#eaf5f6] px-2 py-0.5 text-[8px] text-[#0b7b80]">{events.length}</span></span>
            <span className="text-[9px] font-black text-[#74859a]">{showHistory ? "Hide" : "View history"}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-[#edf2f4] bg-white">
              {events.length === 0 ? <p className="px-3 py-4 text-[10px] text-[#74859a]">{loading ? "Loading readings…" : "No glucose readings recorded in the last 30 days."}</p> : events.slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0b2d54]">{formatNumber(event.loggedValue)} mmol/L <span className="text-[9px] font-semibold text-[#74859a]">· {contextLabel(event)}</span></p>
                    <p className="mt-1 text-[9px] text-[#8a99a6]">{formatDate(event.occurredAt, true)} · {sourceLabel(event)}</p>
                    {event.metadata?.note && <p className="mt-1 text-[9px] leading-4 text-[#74859a]">{String(event.metadata.note)}</p>}
                  </div>
                  <span className={"shrink-0 rounded-full px-2 py-1 text-[8px] font-black " + (event.loggedValue < 3.0 ? "bg-red-50 text-red-800" : event.loggedValue < 3.9 ? "bg-amber-50 text-amber-800" : "bg-[#eef5f6] text-[#647b8c]")}>{event.loggedValue < 3.0 ? "Very low" : event.loggedValue < 3.9 ? "Low" : "Recorded"}</span>
                </div>
              ))}
              <p className="px-3 py-2 text-[8px] font-semibold text-[#9aa8b3]">History shown here is from the last 30 days. Laboratory reports remain in Tests & Results.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f4] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8b3]">Journey</p>
          <p className="mt-0.5 text-xs font-black text-[#0b2d54]">Day {journey.day}{journey.daysLeft !== null ? " · " + journey.daysLeft + " days left" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-[8px] text-[#7d8d99] sm:block">until {goal?.targetDate ? formatDate(goal.targetDate) : "No target date"}</p>
          <Link href={"/health-goals#goal-" + encodeURIComponent(goalId)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </footer>
    </article>
  );
}
