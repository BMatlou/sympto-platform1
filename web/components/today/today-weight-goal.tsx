"use client";
import Link from "next/link";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

type Intent = "LOSE" | "GAIN" | "MAINTAIN";
type WeightEvent = {
  loggedValue: number;
  occurredAt: string;
  source?: string | null;
  sourceId?: string | null;
};
type Props = { goal: any; fallbackWeight?: number | string | null };

const n = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const kg = (value: number | null) => (value == null ? "—" : value.toFixed(1));

const dateLabel = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

function intentFor(goal: any): Intent {
  const raw = String(
    goal?.weightIntent ??
      goal?.intent ??
      goal?.subCategory ??
      goal?.metricConfig?.comparison ??
      goal?.comparison ??
      "",
  ).toUpperCase();

  if (["MAINTAIN", "MAINTENANCE", "STABLE", "CLOSEST"].includes(raw)) {
    return "MAINTAIN";
  }
  if (["GAIN", "INCREASE", "INCREASE_TO"].includes(raw)) {
    return "GAIN";
  }
  return "LOSE";
}

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<WeightEvent[]>([]);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const intent = intentFor(goal);
  const isMaintain = intent === "MAINTAIN";

  const journey = useMemo(() => {
    const start = new Date(String(goal?.createdAt ?? ""));
    const target = new Date(String(goal?.targetDate ?? ""));
    const now = Date.now();
    const daysLeft = Number.isNaN(target.getTime())
      ? null
      : Math.max(
          0,
          Math.ceil((target.getTime() - now) / 86400000),
        );
    return { start, target, daysLeft };
  }, [goal]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await healthGoalsService.getMetricEvents(
          "WEIGHT",
          "weight.kg",
          new Date(0),
          new Date(),
        );

        const intelligenceResult = goal?.id
          ? await healthGoalsService
              .getWeightGoalIntelligence(String(goal.id))
              .catch(() => null)
          : null;

        const next = (response.events ?? [])
          .map((event: any) => ({
            loggedValue: Number(event.loggedValue),
            occurredAt: String(event.occurredAt),
            source: event.source,
            sourceId: event.sourceId,
          }))
          .filter((event: WeightEvent) => Number.isFinite(event.loggedValue));

        if (active) {
          setEvents(
            next.sort(
              (a, b) =>
                Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
            ),
          );
          setIntelligence(intelligenceResult);
        }
      } catch {
        if (active) {
          setEvents([]);
          setIntelligence(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [goal?.id]);

  const currentWeight =
    n(intelligence?.weight?.latestKg) ??
    events.at(-1)?.loggedValue ??
    n(fallbackWeight) ??
    n(goal?.patient?.weightKg);

  const baseline =
    n(intelligence?.weight?.baselineWeightKg) ??
    n(intelligence?.profile?.baselineWeightKg) ??
    n(
      events.find(
        (event) =>
          event.source === "goal-baseline" &&
          event.sourceId === String(goal?.id),
      )?.loggedValue,
    ) ??
    n(goal?.patient?.weightKg) ??
    currentWeight;

  const configuredChange = n(
    goal?.metricConfig?.frequencyTarget ?? goal?.targetValue,
  );

  const targetWeight =
    n(intelligence?.weightPlan?.targetWeightKg) ??
    (intent === "LOSE" &&
    baseline != null &&
    configuredChange != null &&
    configuredChange > 0
      ? baseline - configuredChange
      : null) ??
    (intent === "GAIN" &&
    baseline != null &&
    configuredChange != null &&
    configuredChange > 0
      ? baseline + configuredChange
      : null);

  const journeyWeight = currentWeight;
  const delta =
    baseline != null && journeyWeight != null
      ? journeyWeight - baseline
      : null;

  const maintenanceAverage =
    n(intelligence?.weight?.average7dKg) ?? journeyWeight;

  const maintenanceDelta =
    baseline != null && maintenanceAverage != null
      ? maintenanceAverage - baseline
      : null;

  const stable =
    maintenanceDelta != null && Math.abs(maintenanceDelta) <= 1.5;

  const progress = isMaintain
    ? stable
      ? 100
      : Math.max(
          0,
          Math.round(
            (1 -
              Math.min(Math.abs(maintenanceDelta ?? 1.5), 1.5) /
                1.5) *
              100,
          ),
        )
    : baseline != null &&
        targetWeight != null &&
        journeyWeight != null
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (Math.abs(baseline - journeyWeight) /
                Math.max(Math.abs(baseline - targetWeight), 0.0001)) *
                100,
            ),
          ),
        )
      : 0;

  const heightCm =
    n(intelligence?.profile?.heightCm) ??
    n(intelligence?.healthSnapshot?.heightCm) ??
    n(goal?.patient?.heightCm) ??
    n(goal?.patient?.baseline?.heightCm) ??
    n(goal?.heightCm);

  const bmi =
    currentWeight != null && heightCm != null && heightCm > 0
      ? currentWeight / (heightCm / 100) ** 2
      : null;

  const remaining =
    !isMaintain &&
    targetWeight != null &&
    journeyWeight != null
      ? intent === "LOSE"
        ? Math.max(journeyWeight - targetWeight, 0)
        : Math.max(targetWeight - journeyWeight, 0)
      : null;

  const days = journey.daysLeft;
  const dailyRate =
    !isMaintain && remaining != null && days != null && days > 0
      ? remaining / days
      : null;
  const weeklyRate = dailyRate == null ? null : dailyRate * 7;

  const Icon =
    intent === "GAIN"
      ? TrendingUp
      : intent === "LOSE"
        ? TrendingDown
        : Scale;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <p className="truncate text-base font-black text-[#0b2d54]">
              {String(goal?.title ?? "Weight")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">
              {intent} weight goal
            </p>
          </div>
        </div>

        <span className="rounded-full bg-[#e8f8f7] px-3 py-1.5 text-[10px] font-black text-[#0b7b80]">
          {isMaintain ? (stable ? "Stable" : "Review trend") : "Goal progress"}
        </span>
      </div>

      <div className="flex-1 px-4 pb-5 sm:px-5 sm:pb-6">
        {loading ? (
          <div className="h-[250px] animate-pulse rounded-[26px] bg-[#f5f9fa]" />
        ) : currentWeight == null ||
          baseline == null ||
          (!isMaintain && targetWeight == null) ? (
          <div className="rounded-[26px] bg-[#0b2d54] p-6 text-white">
            <p className="text-xl font-black">
              Weight progress will update automatically
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Record your weight and height in Vitals & Measurements.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[27px] bg-[#0b2d54] text-white shadow-[0_16px_34px_rgba(11,45,84,.16)]">
            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/50">
                Latest recorded weight
              </p>
              <p className="mt-2 text-[48px] font-black leading-none">
                {kg(currentWeight)}
                <span className="ml-1.5 text-lg text-white/55">kg</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80">
                  {isMaintain
                    ? `Baseline ${kg(baseline)} kg`
                    : `${kg(remaining)} kg remaining`}
                </span>
                <span className="rounded-full bg-[#24c1c4]/20 px-3 py-1.5 text-[10px] font-black text-[#7de6e7]">
                  {progress}% progress
                </span>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">
                  Variance
                </p>
                <p className="mt-1 text-sm font-bold">
                  {isMaintain
                    ? `${delta == null ? "—" : `${delta >= 0 ? "+" : ""}${kg(delta)} kg`} from stability baseline`
                    : `${delta == null ? "—" : `${delta >= 0 ? "+" : ""}${kg(delta)} kg`} from starting weight`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 border-t border-white/10">
              <div className="px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">
                  Starting
                </p>
                <p className="mt-1.5 text-sm font-black">
                  {kg(baseline)} kg
                </p>
              </div>

              <div className="border-x border-white/10 px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">
                  BMI now
                </p>
                <p className="mt-1.5 text-sm font-black">
                  {bmi == null ? "—" : bmi.toFixed(1)}
                </p>
              </div>

              <div className="px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">
                  Intent
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-sm font-black">
                  <Icon className="h-3.5 w-3.5 text-[#7de6e7]" />
                  {intent}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading &&
          !isMaintain &&
          dailyRate != null &&
          weeklyRate != null && (
            <div className="mt-4 rounded-[20px] border border-[#e1eaed] bg-[#f8fbfc] px-4 py-3.5 text-[10px] font-semibold leading-5 text-[#74859a]">
              {intent === "LOSE" ? "Lose" : "Gain"} about{" "}
              {kg(remaining)} kg more by {dateLabel(journey.target)}:
              approximately {dailyRate.toFixed(2)} kg/day or{" "}
              {weeklyRate.toFixed(1)} kg/week. This is a mathematical pace,
              not a clinical prescription.
            </div>
          )}

        {!loading && currentWeight != null && (
          <div className="mt-4 rounded-[20px] border border-[#dcebed] bg-[#f4fbfa] px-4 py-3.5 text-[10px] leading-5 text-[#496a73]">
            <p className="font-black uppercase tracking-[.12em]">
              Weight & BMI guidance
            </p>
            <p className="mt-1.5">
              {isMaintain
                ? `Maintenance uses a ±1.5 kg stability window around ${kg(baseline)} kg. Daily and weekly reduction rates are intentionally hidden.`
                : "BMI is screening context only. Review restrictive targets with a doctor or registered dietitian."}
            </p>
            <p className="mt-2 text-[9px] text-[#718890]">
              BMI is an anthropometric screening indicator, not a diagnosis.
            </p>
          </div>
        )}
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]">
          <span>{isMaintain ? "Maintenance journey" : "Weight goal"}</span>
          <Link
            href={`/health-goals#goal-${encodeURIComponent(String(goal?.id ?? ""))}`}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54] hover:bg-white"
          >
            View goal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-[#9aa8b1]">
          For maintenance goals, recent weight averages are compared with a
          ±1.5 kg stability window around the baseline. Daily and weekly
          reduction rates are intentionally hidden because maintenance is not
          a weight-loss pace.
        </p>
      </div>
    </article>
  );
}
