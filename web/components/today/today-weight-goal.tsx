"use client";
import Link from "next/link";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

type Intent = "LOSE" | "GAIN" | "MAINTAIN";
type EventRow = { loggedValue: number; occurredAt: string; source?: string | null; sourceId?: string | null };
type Props = { goal: any; fallbackWeight?: number | string | null };

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const kg = (v: number | null) => (v == null ? "—" : v.toFixed(1));

const intentOf = (goal: any): Intent => {
  const raw = String(
    goal?.weightIntent ??
      goal?.intent ??
      goal?.subCategory ??
      goal?.metricConfig?.comparison ??
      goal?.comparison ??
      "DECREASE_TO",
  ).toUpperCase();
  if (["MAINTAIN", "MAINTENANCE", "STABLE", "CLOSEST"].includes(raw)) return "MAINTAIN";
  if (["GAIN", "INCREASE", "INCREASE_TO"].includes(raw)) return "GAIN";
  return "LOSE";
};

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);

  const goalId = String(goal?.id ?? "");
  const intent = intentOf(goal);
  const maintain = intent === "MAINTAIN";

  const journey = useMemo(() => {
    const start = new Date(String(goal?.createdAt ?? ""));
    const target = new Date(String(goal?.targetDate ?? ""));
    const now = Date.now();
    const daysLeft = Number.isNaN(target.getTime())
      ? null
      : Math.max(0, Math.ceil((target.getTime() - now) / 86400000));
    return { start, target, daysLeft };
  }, [goal]);

  const reload = useCallback(async () => {
    const requestId = ++sequence.current;
    setLoading(true);
    setEvents([]);
    setBaseline(null);
    setIntelligence(null);

    try {
      const [metric, intelligenceResponse] = await Promise.all([
        healthGoalsService.getMetricEvents(
          "WEIGHT",
          "weight.kg",
          new Date(0),
          new Date(),
        ),
        goalId
          ? healthGoalsService.getWeightGoalIntelligence(goalId).catch(() => null)
          : Promise.resolve(null),
      ]);

      const all = (metric.events ?? [])
        .map((e: any) => ({
          loggedValue: Number(e.loggedValue),
          occurredAt: String(e.occurredAt),
          source: e.source,
          sourceId: e.sourceId,
        }))
        .filter(
          (e: EventRow) =>
            Number.isFinite(e.loggedValue) &&
            !Number.isNaN(Date.parse(e.occurredAt)),
        )
        .sort(
          (a: EventRow, b: EventRow) =>
            Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
        );

      if (requestId !== sequence.current) return;

      const goalBaseline = all.find(
        (e) => e.source === "goal-baseline" && String(e.sourceId) === goalId,
      );
      const created = Date.parse(String(goal?.createdAt ?? ""));
      const historical = Number.isNaN(created)
        ? null
        : [...all]
            .reverse()
            .find(
              (e) =>
                e.source !== "goal-baseline" &&
                Date.parse(e.occurredAt) <= created,
            );

      setEvents(all.filter((e) => e.source !== "goal-baseline"));
      setBaseline(goalBaseline?.loggedValue ?? historical?.loggedValue ?? null);
      setIntelligence(
        intelligenceResponse?.intelligence ?? intelligenceResponse ?? null,
      );
    } catch (err) {
      console.error("Failed to load weight metrics:", err);
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, [goalId, goal?.createdAt, fallbackWeight]);

  useEffect(() => {
    let active = true;
    void reload();
    const refresh = () => {
      if (active) void reload();
    };

    window.addEventListener("sympto:weight-updated", refresh);
    window.addEventListener("sympto:health-checkin-updated", refresh);
    window.addEventListener("sympto:health-goal-updated", refresh);

    return () => {
      active = false;
      window.removeEventListener("sympto:weight-updated", refresh);
      window.removeEventListener("sympto:health-checkin-updated", refresh);
      window.removeEventListener("sympto:health-goal-updated", refresh);
    };
  }, [reload]);

  const current =
    events.at(-1)?.loggedValue ??
    num(intelligence?.weight?.latestKg) ??
    num(fallbackWeight) ??
    num(goal?.patient?.weightKg);

  const start =
    baseline ??
    num(intelligence?.profile?.baselineWeightKg) ??
    num(goal?.patient?.weightKg) ??
    current;

  const requested = num(
    goal?.metricConfig?.frequencyTarget ?? goal?.targetValue,
  );

  const target =
    num(intelligence?.weightPlan?.targetWeightKg) ??
    (start != null && requested != null && requested > 0
      ? intent === "LOSE"
        ? start - requested
        : intent === "GAIN"
          ? start + requested
          : start
      : null);

  const average = num(intelligence?.weight?.average7dKg) ?? current;
  const variance = start != null && average != null ? average - start : null;
  const stable =
    maintain && variance != null && Math.abs(variance) <= 1.5;

  const progress = maintain
    ? variance == null
      ? 0
      : Math.round(
          Math.max(
            0,
            Math.min(
              100,
              (1 - Math.min(Math.abs(variance), 1.5) / 1.5) * 100,
            ),
          ),
        )
    : start != null && current != null && target != null
      ? Math.round(
          Math.max(
            0,
            Math.min(
              100,
              (Math.abs(start - current) /
                Math.max(Math.abs(start - target), 0.0001)) *
                100,
            ),
          ),
        )
      : 0;

  const height =
    num(intelligence?.profile?.heightCm) ??
    num(intelligence?.healthSnapshot?.heightCm) ??
    num(goal?.patient?.heightCm) ??
    num(goal?.patient?.baseline?.heightCm);

  const bmi =
    current != null && height != null && height > 0
      ? current / (height / 100) ** 2
      : null;

  const context = intelligence?.healthContext ?? {};
  const medications = Array.isArray(context.activeMedications)
    ? context.activeMedications
    : [];
  const conditions = Array.isArray(context.activeConditions)
    ? context.activeConditions
    : [];
  const recommendations = Array.isArray(
    intelligence?.recommendedSupportingGoals,
  )
    ? intelligence.recommendedSupportingGoals
    : [];

  const Icon =
    intent === "GAIN"
      ? TrendingUp
      : intent === "LOSE"
        ? TrendingDown
        : Scale;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <header className="flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <p className="text-base font-black text-[#0b2d54]">
              {String(goal?.title ?? "Weight")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">
              {intent} weight goal
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#e8f8f7] px-3 py-1.5 text-[10px] font-black text-[#0b7b80]">
          {maintain ? (stable ? "Stable" : "Review trend") : "Goal progress"}
        </span>
      </header>

      <div className="flex-1 px-4 pb-5">
        {loading ? (
          <div className="h-[250px] animate-pulse rounded-[26px] bg-[#f5f9fa]" />
        ) : current == null || start == null || (!maintain && target == null) ? (
          <div className="rounded-[26px] bg-[#0b2d54] p-6 text-white">
            <p className="text-xl font-black">
              Weight progress will update automatically
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Record a weight and height in Vitals & Measurements.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[27px] bg-[#0b2d54] text-white">
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">
                Latest recorded weight
              </p>
              <p className="mt-2 text-[48px] font-black leading-none">
                {kg(current)}
                <span className="ml-1.5 text-lg text-white/55">kg</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black">
                  {maintain
                    ? `Baseline ${kg(start)} kg`
                    : `${kg(Math.max(0, Math.abs((current ?? 0) - (target ?? 0))))} kg remaining`}
                </span>
                <span className="rounded-full bg-[#24c1c4]/20 px-3 py-1.5 text-[10px] font-black text-[#7de6e7]">
                  {progress}% {maintain ? "stability" : "progress"}
                </span>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">
                  Variance
                </p>
                <p className="mt-1 text-sm font-bold">
                  {variance == null
                    ? "—"
                    : `${variance >= 0 ? "+" : ""}${kg(variance)} kg from ${maintain ? "stability" : "starting"} baseline`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-white/10">
              <div className="px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Starting</p>
                <p className="mt-1.5 text-sm font-black">{kg(start)} kg</p>
              </div>
              <div className="border-x border-white/10 px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">BMI now</p>
                <p className="mt-1.5 text-sm font-black">{bmi == null ? "—" : bmi.toFixed(1)}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Intent</p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-sm font-black">
                  <Icon className="h-3.5 w-3.5 text-[#7de6e7]" />
                  {intent}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !maintain && target != null && (
          <div className="mt-4 rounded-[20px] border border-[#e1eaed] bg-[#f8fbfc] px-4 py-3.5 text-[10px] leading-5 text-[#74859a]">
            {intent === "LOSE" ? "Loss" : "Gain"} tracking uses the configured destination of{" "}
            <strong>{kg(target)} kg</strong>. Pacing is mathematical tracking, not a clinical prescription.
          </div>
        )}

        {!loading && (
          <div className="mt-4 space-y-3 text-left">
            <div className="rounded-[20px] border border-[#dfeaec] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0b7b80]">
                Clinical Recommendations
              </p>
              {recommendations.length ? (
                <div className="mt-3 space-y-2.5">
                  {recommendations.slice(0, 4).map((recommendation: any, i: number) => (
                    <div key={recommendation?.id ?? i} className="rounded-xl bg-[#f5fafb] p-3">
                      <p className="text-xs font-black text-[#0b2d54]">
                        {recommendation?.title ?? recommendation?.name ?? "Supporting health goal"}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-500">
                        {recommendation?.description ??
                          recommendation?.rationale ??
                          "Recommended supporting goal based on available health context."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] leading-4 text-slate-400">
                  No supporting goal recommendations are currently available.
                </p>
              )}
            </div>

            <div className="rounded-[20px] border border-[#dfeaec] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0b7b80]">
                Connected Healthcare Profile
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">
                    Active Medications
                  </p>
                  {medications.length ? (
                    <div className="mt-2 space-y-2">
                      {medications.slice(0, 4).map((medication: any, i: number) => (
                        <div key={medication?.id ?? i} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbfc] px-3 py-2.5">
                          <span className="text-xs font-bold text-[#0b2d54]">
                            {medication?.name ??
                              medication?.customName ??
                              medication?.medication?.name ??
                              medication?.medication?.genericName ??
                              "Medication"}
                          </span>
                          <span className="shrink-0 text-right text-[10px] font-medium text-slate-400">
                            {medication?.dosage
                              ? `${medication.dosage} · `
                              : ""}
                            {medication?.frequency ?? "Prescribed"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      No active medications are currently connected.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">
                    Active Conditions
                  </p>
                  {conditions.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {conditions.slice(0, 4).map((condition: any, i: number) => (
                        <span key={condition?.id ?? i} className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {condition?.name ??
                            condition?.title ??
                            condition?.condition?.name ??
                            "Active condition"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      No active conditions are currently connected.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {current != null && (
              <p className="px-1 text-[9px] leading-4 text-slate-400">
                Consult a doctor or registered dietitian before pursuing restrictive energy targets or making dramatic weight-maintenance changes.
              </p>
            )}
          </div>
        )}
      </div>

      <footer className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#74859a]">
          <span>Weight goal</span>
          <Link
            href={`/health-goals#goal-${encodeURIComponent(String(goal?.id ?? ""))}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54]"
          >
            View goal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
