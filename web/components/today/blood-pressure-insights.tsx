"use client";

import { Activity, AlertTriangle, BarChart3, Moon, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";
import { buildBloodPressureInsights, type BloodPressureInsight } from "@/lib/blood-pressure-insights";

type Props = {
  target: number | null;
  exerciseGoalTarget?: number | null;
  exerciseGoalTitle?: string | null;
};

const iconFor = (insight: BloodPressureInsight) => {
  if (insight.title.includes("higher lately") || insight.title.includes("above your target")) return TrendingUp;
  if (insight.title.includes("lower lately") || insight.title.includes("within your target")) return TrendingDown;
  if (insight.kind === "time") return BarChart3;
  if (insight.kind === "sleep") return Moon;
  if (insight.kind === "exercise") return Activity;
  return Sparkles;
};

export default function BloodPressureInsights({ target, exerciseGoalTarget = null, exerciseGoalTitle = "Exercise" }: Props) {
  const [insights, setInsights] = useState<BloodPressureInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const to = new Date();
      const from = new Date(0);

      try {
        const [bloodPressure, exercise, journals, symptoms] = await Promise.all([
          healthGoalsService.getMetricEvents("BLOOD_PRESSURE", "blood_pressure.systolic", from, to),
          healthGoalsService.getMetricEvents("EXERCISE", "exercise.minutes", from, to),
          healthJournalService.getAll({ limit: 100 }),
          healthJournalService.getSymptoms({ limit: 100 }),
        ]);

        if (!active) return;

        setInsights(
          buildBloodPressureInsights({
            bloodPressureEvents: bloodPressure.events ?? [],
            exerciseEvents: exercise.events ?? [],
            journals: journals.data ?? [],
            symptoms,
            target,
            exerciseGoalTarget,
            exerciseGoalTitle,
            now: to,
          }),
        );
      } catch {
        if (active) {
          setInsights([{
            kind: "data",
            tone: "info",
            title: "Keep building your blood pressure record",
            body: "Your goal is still connected to Health Vitals. More recorded readings will give Sympto more information to identify useful patterns.",
          }]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    const handleRefresh = () => { void load(); };
    window.addEventListener("sympto:today-action-updated", handleRefresh);
    window.addEventListener("sympto:health-checkin-updated", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("sympto:today-action-updated", handleRefresh);
      window.removeEventListener("sympto:health-checkin-updated", handleRefresh);
    };
  }, [target, exerciseGoalTarget, exerciseGoalTitle]);

  return (
    <section className="mt-3 rounded-[19px] border border-[#dcebed] bg-[#f8fbfc] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e8f8f7] text-[#0b7b80]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Sympto Insights</p>
            <p className="mt-0.5 text-[9px] font-semibold text-[#7d8f9c]">Patterns across your blood pressure and connected health data</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-14 animate-pulse rounded-xl bg-white" />
          <div className="h-14 animate-pulse rounded-xl bg-white" />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {insights.map((insight, index) => {
            const Icon = iconFor(insight);
            const warning = insight.tone === "warning";
            const primary = index === 0;
            return (
              <article
                key={insight.kind + "-" + insight.title}
                className={
                  warning
                    ? "rounded-[18px] border border-red-100 bg-red-50/70 p-4"
                    : primary
                      ? "rounded-[18px] border border-[#dcebed] bg-white p-4"
                      : "rounded-[17px] border border-[#e1ecef] bg-white p-3.5"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={
                      warning
                        ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-red-100 text-red-700"
                        : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-[#e8f8f7] text-[#0b7b80]"
                    }
                  >
                    {warning ? <AlertTriangle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        warning
                          ? "text-[11px] font-black tracking-[-.01em] text-red-950"
                          : "text-[11px] font-black tracking-[-.01em] text-[#0b2d54]"
                      }
                    >
                      {insight.title}
                    </p>
                    <p
                      className={
                        warning
                          ? "mt-1 text-[10px] leading-5 text-red-900/80"
                          : "mt-1 text-[10px] leading-5 text-[#637986]"
                      }
                    >
                      {insight.body}
                    </p>

                    {insight.evidence && (
                      <div className="mt-3 rounded-[13px] bg-[#f7fbfb] px-3 py-2.5">
                        <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#8b9aa4]">At a glance</p>
                        <p className="mt-1 text-[9px] font-bold leading-4 text-[#0b2d54]">{insight.evidence}</p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[8px] leading-4 text-[#97a5ae]">
        Sympto highlights patterns in the readings you record. It does not diagnose a condition.
      </p>
    </section>
  );
}
