"use client";

import Link from "next/link";
import { ArrowRight, Clock3, FlaskConical, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import GoalCardDisclosureButton from "@/components/today/goal-card-disclosure-button";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";

type Props = {
  goal: any;
  labOrders?: any[];
  activeGoals?: any[];
  onUpdated?: () => Promise<void> | void;
  detailsExpanded?: boolean;
  onToggleDetails?: () => void;
};

type CholesterolEntry = {
  id: string;
  value: number;
  occurredAt: string;
  source: string;
  note?: string;
};

type ReleasedCholesterolLab = {
  id: string;
  testName: string;
  valueText: string;
  numericValue: number | null;
  unit: string;
  occurredAt: string;
  laboratoryName: string;
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "Date not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en-ZA", includeTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function localDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localDayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(values.year) + "-" + String(values.month) + "-" + String(values.day);
}

function isMmolPerLitre(unit: string) {
  const normalized = unit.toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-");
  return ["mmol/l", "mmoll-1", "mmol·l-1", "mmol/litre", "mmol/liter"].includes(normalized);
}

function dayOrdinal(value: unknown) {
  const key = localDayKey(value);
  const [year, month, day] = key.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return Number.NaN;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function releasedCholesterolLabs(labOrders: any[]): ReleasedCholesterolLab[] {
  const measures: ReleasedCholesterolLab[] = [];
  for (const order of Array.isArray(labOrders) ? labOrders : []) {
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    for (const orderItem of orderItems) {
      const results = Array.isArray(orderItem?.labResults) ? orderItem.labResults : [];
      for (const result of results) {
        const status = String(result?.status ?? "").toUpperCase();
        const finalized = ["RELEASED", "VERIFIED", "AMENDED"].includes(status)
          || Boolean(result?.releasedAt || result?.reportedAt);
        if (!finalized || status === "CANCELLED") continue;
        const date = result?.releasedAt ?? result?.reportedAt ?? result?.createdAt ?? "";
        const resultItems = Array.isArray(result?.items) ? result.items : [];
        for (const item of resultItems) {
          const test = item?.test ?? orderItem?.test ?? {};
          const testName = String(test?.name ?? test?.shortName ?? test?.code ?? "");
          if (!/cholesterol/i.test(testName) || /(hdl|ldl|non[- ]?hdl|triglycer|vldl)/i.test(testName)) continue;
          const rawValue = item?.numericValue ?? item?.textValue;
          if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") continue;
          measures.push({
            id: "lab-" + String(result?.id ?? orderItem?.id ?? measures.length) + "-" + String(item?.id ?? measures.length),
            testName,
            valueText: String(rawValue),
            numericValue: numberOrNull(rawValue),
            unit: String(test?.unit?.symbol ?? test?.unit?.name ?? ""),
            occurredAt: String(date),
            laboratoryName: String(order?.laboratory?.name ?? ""),
          });
        }
      }
    }
  }
  return measures.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

function relatedGoalLabel(goal: any) {
  const category = String(goal?.category ?? "").toUpperCase();
  const labels: Record<string, string> = {
    EXERCISE: "Exercise",
    NUTRITION: "Nutrition",
    BLOOD_PRESSURE: "Blood pressure",
    BLOOD_GLUCOSE: "Blood glucose",
    SLEEP: "Sleep",
    WEIGHT: "Weight",
    MEDICATION: "Medication",
    HYDRATION: "Hydration",
  };
  return labels[category] ?? String(goal?.title ?? "Related goal");
}

export default function TodayCholesterolGoal({ goal, labOrders = [], activeGoals = [], onUpdated, detailsExpanded, onToggleDetails }: Props) {
  const [events, setEvents] = useState<CholesterolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState("");
  const [measuredAt, setMeasuredAt] = useState(() => localDateTimeInput(new Date()));
  const [recordSource, setRecordSource] = useState<"MEASURED" | "LAB_REPORT">("MEASURED");
  const [note, setNote] = useState("");

  const goalId = String(goal?.id ?? "");
  const targetRaw = goal?.targetValue ?? goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget;
  const targetValue = numberOrNull(targetRaw);
  const target = targetValue != null && targetValue > 0 ? targetValue : null;

  const loadEvents = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    try {
      const response = await healthGoalsService.getMetricEvents("CHOLESTEROL", "cholesterol.total", from, now);
      const loaded = (Array.isArray(response?.events) ? response.events : [])
        .map((event: any) => {
          const occurredAt = String(event?.occurredAt ?? "");
          const metadata = event?.metadata && typeof event.metadata === "object" ? event.metadata : {};
          const source = String(metadata?.recordSource ?? "");
          return {
            id: String(event?.id ?? occurredAt + "-" + event?.loggedValue),
            value: Number(event?.loggedValue),
            occurredAt,
            source: source === "LAB_REPORT"
              ? "Manually transcribed from a lab report"
              : String(event?.source ?? "").startsWith("lab-result")
                ? "Laboratory result"
                : "Recorded in Today",
            note: String(metadata?.note ?? "") || undefined,
          };
        })
        .filter((event: CholesterolEntry) =>
          Number.isFinite(event.value) && event.value > 0 && Boolean(event.occurredAt) && !Number.isNaN(new Date(event.occurredAt).getTime()),
        );
      setEvents(loaded);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadEvents();
    };
    void refresh();
    const handleUpdated = () => void refresh();
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    window.addEventListener("sympto:today-action-updated", handleUpdated);
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    const interval = window.setInterval(() => void refresh(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
      window.removeEventListener("sympto:today-action-updated", handleUpdated);
      window.removeEventListener("sympto:health-checkin-updated", handleUpdated);
    };
  }, [loadEvents]);

  const releasedLabs = useMemo(() => releasedCholesterolLabs(labOrders), [labOrders]);
  const comparableLabEntries = useMemo((): CholesterolEntry[] => releasedLabs
    .filter((lab) => lab.numericValue != null && lab.numericValue > 0 && isMmolPerLitre(lab.unit) && !Number.isNaN(new Date(lab.occurredAt).getTime()))
    .map((lab) => ({
      id: lab.id,
      value: lab.numericValue as number,
      occurredAt: lab.occurredAt,
      source: "Released lab result" + (lab.laboratoryName ? " · " + lab.laboratoryName : ""),
    })), [releasedLabs]);

  const history = useMemo(() => {
    const bySample = new Map<string, CholesterolEntry>();
    for (const entry of [...events, ...comparableLabEntries]) {
      const day = localDayKey(entry.occurredAt);
      const key = day + ":" + entry.value.toFixed(3);
      const existing = bySample.get(key);
      // A released lab result is the stronger source if the same sample also
      // appears in the metric-event feed.
      if (!existing || entry.source.startsWith("Released lab result")) bySample.set(key, entry);
    }
    return Array.from(bySample.values()).sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }, [events, comparableLabEntries]);

  const latest = history[0] ?? null;
  const priorComparable = useMemo(() => {
    if (!latest) return null;
    const currentDay = localDayKey(latest.occurredAt);
    return history.find((entry) => entry.id !== latest.id && localDayKey(entry.occurredAt) !== currentDay) ?? null;
  }, [history, latest]);

  const delta = latest && priorComparable ? latest.value - priorComparable.value : null;
  const differenceFromTarget = latest && target != null ? latest.value - target : null;
  const relatedGoals = useMemo(() => {
    const relations = Array.isArray(goal?.connectedGoals) ? goal.connectedGoals : [];
    const byId = new Map<string, any>();
    for (const relation of relations) {
      const related = relation?.goal;
      const id = String(related?.id ?? "");
      if (!id) continue;
      const previous = byId.get(id);
      const type = String(relation?.relationshipType ?? "").toUpperCase();
      if (!previous || (type === "SUPPORTS" && String(previous?.relationshipType ?? "").toUpperCase() !== "SUPPORTS")) {
        byId.set(id, relation);
      }
    }
    if (byId.size === 0) {
      // Only use current active goals when a relationship explicitly references them.
      for (const relation of relations) {
        const id = String(relation?.goalId ?? relation?.relatedGoalId ?? "");
        const related = activeGoals.find((item: any) => String(item?.id ?? "") === id);
        if (related?.id && !byId.has(String(related.id))) byId.set(String(related.id), { ...relation, goal: related });
      }
    }
    return Array.from(byId.values());
  }, [goal?.connectedGoals, activeGoals]);

  async function saveReading() {
    const numeric = numberOrNull(value);
    if (numeric == null || numeric <= 0) {
      toast.error("Enter a cholesterol result greater than zero.");
      return;
    }
    if (!measuredAt) {
      toast.error("Choose the date and time of the measured result.");
      return;
    }
    const occurredAt = new Date(measuredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) {
      toast.error("Choose a valid measurement date and time that is not in the future.");
      return;
    }
    if (!goalId) return;

    setSaving(true);
    try {
      await healthGoalsService.syncMetricEvent({
        metricType: "CHOLESTEROL",
        metricKey: "cholesterol.total",
        loggedValue: numeric,
        occurredAt: occurredAt.toISOString(),
        source: "goal-manual",
        sourceId: "cholesterol-goal-" + goalId + "-" + Date.now(),
        metadata: {
          unit: "mmol/L",
          recordSource,
          note: note.trim() || undefined,
        },
      });
      let journalSaved = true;
      try {
        await healthJournalService.create({
          title: "Goal measurement · Cholesterol",
          journal: "Total cholesterol: " + formatNumber(numeric) + " mmol/L.",
          notes: [
            "Recorded from Today.",
            "Measurement date and time: " + formatDate(occurredAt, true) + ".",
            recordSource === "LAB_REPORT" ? "Transcribed from a lab report." : "Entered as a measured result.",
            note.trim() ? "Note: " + note.trim() : "",
          ].filter(Boolean).join(" "),
        });
      } catch {
        journalSaved = false;
      }
      if (journalSaved) {
        toast.success("Cholesterol result recorded.");
      } else {
        toast.warning("Cholesterol result saved", {
          description: "The result was saved, but the Health Journal entry could not be added.",
        });
      }
      setValue("");
      setNote("");
      setOpen(false);
      await loadEvents();
      window.dispatchEvent(new Event("sympto:health-goal-updated"));
      await onUpdated?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(" ") : String(message || "We could not save this cholesterol result."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article id={"today-goal-" + encodeURIComponent(goalId)} className={detailsExpanded ? "flex h-auto min-w-0 flex-col overflow-visible rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]" : "flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]"}>
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d3efed]"><FlaskConical className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-[-.035em] text-[#0b2d54]">Cholesterol</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#8a99a6]">Total cholesterol · mmol/L</p>
          </div>
        </div>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black " + (loading ? "bg-[#eef5f6] text-[#71879b]" : latest ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#eef5f6] text-[#71879b]")}>
          {loading ? "Loading" : latest ? "Result recorded" : "Awaiting result"}
        </span>
      </header>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <section className="relative overflow-hidden rounded-[23px] bg-[#0b2d54] px-4 py-4 text-white shadow-[0_12px_28px_rgba(11,45,84,.12)] sm:px-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#24c1c4]/16 blur-2xl" />
          <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/45">Latest comparable result</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-[42px] font-black leading-none tracking-[-.075em]">{latest ? formatNumber(latest.value) : "—"}</p>
                <span className="text-sm font-bold text-white/55">mmol/L</span>
              </div>
              <p className="mt-2 text-[9px] font-semibold text-white/60">{latest ? formatDate(latest.occurredAt, true) + " · " + latest.source : loading ? "Loading saved results…" : "No dated total cholesterol result found yet."}</p>
            </div>
            <div className="rounded-[17px] bg-white/[.07] px-4 py-3 ring-1 ring-white/10 sm:min-w-[142px]">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/45">Saved goal ceiling</p>
              <p className="mt-1 text-xl font-black">{target == null ? "—" : "≤ " + formatNumber(target)}</p>
              <p className="mt-0.5 text-[8px] font-semibold text-white/45">Confirm with your care team</p>
            </div>
          </div>
          <div className="relative mt-4 rounded-[15px] bg-white/[.06] px-3 py-2.5">
            <p className="text-[9px] font-semibold leading-4 text-white/75">
              {latest && differenceFromTarget != null
                ? differenceFromTarget > 0
                  ? "Latest recorded result is " + formatNumber(differenceFromTarget) + " mmol/L above your saved goal ceiling. Review your result and target with your care team."
                  : differenceFromTarget < 0
                    ? "Latest recorded result is " + formatNumber(Math.abs(differenceFromTarget)) + " mmol/L below your saved goal ceiling. This is a goal comparison, not a full cardiovascular risk assessment."
                    : "Latest recorded result matches your saved goal ceiling. Confirm that this target is appropriate for your individual risk profile."
                : "Record a dated total cholesterol result to begin comparing your own results over time."}
            </p>
          </div>
        </section>

        {onToggleDetails && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
            {!detailsExpanded && (
              <button
                type="button"
                onClick={() => {
                  if (!open) {
                    setMeasuredAt(localDateTimeInput(new Date()));
                    setValue("");
                    setNote("");
                    setOpen(true);
                  }
                  onToggleDetails();
                }}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-[#123e66]"
              >
                <Plus className="h-3.5 w-3.5 text-[#24c1c4]" /> {latest ? "Record result" : "Add result"}
              </button>
            )}
            <GoalCardDisclosureButton expanded={Boolean(detailsExpanded)} onToggle={onToggleDetails} label="Show results & insights" />
          </div>
        )}
        {detailsExpanded && (
          <>
        {releasedLabs.length > 0 && (() => {
          const lab = releasedLabs[0];
          const comparable = lab.numericValue != null && isMmolPerLitre(lab.unit);
          return (
            <section className="mt-3 flex items-start justify-between gap-3 rounded-[15px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#7f919d]">Latest released lab result</p>
                <p className="mt-1 text-xs font-black text-[#0b2d54]">{lab.valueText}{lab.unit ? " " + lab.unit : ""}</p>
                <p className="mt-0.5 text-[9px] leading-4 text-[#74859a]">{lab.testName} · {formatDate(lab.occurredAt)}{lab.laboratoryName ? " · " + lab.laboratoryName : ""}</p>
                {!comparable && <p className="mt-1 text-[8px] leading-4 text-[#8a99a6]">This result is kept separate from mmol/L tracking because its unit is not confirmed as mmol/L.</p>}
              </div>
              <Link href="/tests-results" className="shrink-0 text-[8px] font-black text-[#0b7b80]">View results <ArrowRight className="ml-1 inline h-2.5 w-2.5" /></Link>
            </section>
          );
        })()}

        <section className="mt-3 rounded-[17px] border border-[#e2ecef] bg-[#fbfdfd] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Recorded trend</p>
              <p className="mt-1 text-sm font-black text-[#0b2d54]">
                {delta == null ? "Building your history" : Math.abs(delta) < 0.05 ? "Similar to previous result" : formatNumber(Math.abs(delta)) + " mmol/L " + (delta > 0 ? "higher" : "lower") + " than previous"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#8a99a6]">Dated results</p>
              <p className="mt-1 text-lg font-black text-[#0b2d54]">{history.length}</p>
            </div>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-[#74859a]">
            {delta == null
              ? "A record from another date is needed before Sympto can compare results. Total cholesterol is only one part of a cardiovascular risk review."
              : "Compared with the previous dated result (" + formatDate(priorComparable?.occurredAt) + "). This describes recorded values only and is not a diagnosis or treatment recommendation."}
          </p>
        </section>

        {relatedGoals.length > 0 && (
          <section className="mt-3 rounded-[17px] border border-[#e2ecef] bg-white px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Related goals</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{relatedGoals.length} connected</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {relatedGoals.map((relation: any) => {
                const related = relation?.goal;
                const id = String(related?.id ?? "");
                const relationType = String(relation?.relationshipType ?? "").toUpperCase();
                const relationLabel = relationType === "SUPPORTS"
                  ? String(relation?.direction ?? "") === "supportsThisGoal" ? "Supports this" : "Supports another"
                  : "Related";
                return (
                  <Link key={String(relation?.id ?? id)} href={id ? "/today#today-goal-" + encodeURIComponent(id) : "/today#today-goals"}
                    title={String(relation?.rationale ?? "")}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f7fbfb] px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb]">
                    {relatedGoalLabel(related)} <span className="text-[#91a2ad]">· {relationLabel}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {open && (
          <section className="mt-3 rounded-[18px] border border-[#e1ecee] bg-[#f8fbfb] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">New measurement</p>
                <p className="mt-1 text-sm font-black text-[#0b2d54]">Record total cholesterol</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-[#74859a]">mmol/L</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Measured result</span>
                <input aria-label="Total cholesterol result in mmol/L" type="number" min="0.1" step="0.1" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. 5.2" className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Result source</span>
                <select value={recordSource} onChange={(event) => setRecordSource(event.target.value as "MEASURED" | "LAB_REPORT")} className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]">
                  <option value="MEASURED">Measured result</option>
                  <option value="LAB_REPORT">Transcribed from a lab report</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Measurement date and time</span>
                <input type="datetime-local" max={localDateTimeInput(new Date())} value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Note (optional)</span>
                <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Laboratory, clinician note, or anything you want to remember" className="mt-1.5 min-h-10 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-semibold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              </label>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#74859a]">Use a total cholesterol result from a measured or released laboratory test. If you have a lab report already in Sympto, open Tests & results rather than adding the same result twice.</p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-xl border border-[#d7e4e8] bg-white px-3.5 text-[9px] font-black text-[#74859a]">Cancel</button>
              <button type="button" disabled={saving || !value.trim()} onClick={() => void saveReading()} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 text-[9px] font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save result"}</button>
            </div>
          </section>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">{latest ? "Each entry keeps its date and source. Total cholesterol alone does not determine your overall cardiovascular risk." : "Start with a dated total cholesterol measurement. Sympto will keep each result separate so you can review changes over time."}</p>
          <button type="button" onClick={() => { setOpen((current) => !current); if (!open) { setMeasuredAt(localDateTimeInput(new Date())); setValue(""); setNote(""); } }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white"><Plus className="h-3 w-3" />{open ? "Close" : latest ? "Record result" : "Add result"}</button>
        </div>

        <section className="mt-3 overflow-hidden rounded-[18px] border border-[#e2ecef]">
          <button type="button" onClick={() => setShowHistory((current) => !current)} className="flex min-h-10 w-full items-center justify-between gap-3 bg-[#fbfdfd] px-3 py-2.5 text-left">
            <span className="inline-flex items-center gap-2 text-[9px] font-black text-[#0b2d54]"><Clock3 className="h-3.5 w-3.5 text-[#0b7b80]" />Recent results <span className="rounded-full bg-[#eaf5f6] px-2 py-0.5 text-[8px] text-[#0b7b80]">{history.length}</span></span>
            <span className="text-[9px] font-black text-[#74859a]">{showHistory ? "Hide history" : "View history"}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-[#edf2f4] bg-white">
              {history.length === 0
                ? <p className="px-3 py-4 text-[10px] text-[#74859a]">{loading ? "Loading results…" : "No comparable total cholesterol results found in the last year."}</p>
                : history.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#0b2d54]">{formatNumber(entry.value)} mmol/L</p>
                      <p className="mt-1 text-[9px] text-[#8a99a6]">{formatDate(entry.occurredAt, true)} · {entry.source}</p>
                      {entry.note && <p className="mt-1 text-[9px] leading-4 text-[#74859a]">{entry.note}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eef5f6] px-2 py-1 text-[8px] font-black text-[#647b8c]">Recorded</span>
                  </div>
                ))}
              <p className="px-3 py-2 text-[8px] font-semibold text-[#9aa8b3]">Only results with a confirmed mmol/L unit are compared in this history. Other units stay visible separately under the latest lab result.</p>
            </div>
          )}
        </section>

          </>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf2f4] px-1 pt-3">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8b3]">Journey</p>
            <p className="mt-0.5 text-xs font-black text-[#0b2d54]">{(() => {
              const today = dayOrdinal(new Date());
              const start = dayOrdinal(goal?.createdAt);
              const end = goal?.targetDate ? dayOrdinal(goal.targetDate) : Number.NaN;
              const day = Number.isFinite(start) && Number.isFinite(today) ? Math.max(1, today - start + 1) : 1;
              const left = Number.isFinite(end) && Number.isFinite(today) ? Math.max(0, end - today) : null;
              return "Day " + day + (left === null ? " · Journey active" : " · " + left + " days left");
            })()}</p>
          </div>
          <Link href="/tests-results" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">
            Tests & results <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
