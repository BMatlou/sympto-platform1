"use client";

import { Activity, AlertTriangle, BarChart3, Moon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";
import { buildBloodPressureInsights, type BloodPressureInsight } from "@/lib/blood-pressure-insights";

type Props = {
  target: number | null;
};

const iconFor = (kind: BloodPressureInsight["kind"]) => {
  if (kind === "time") return BarChart3;
  if (kind === "sleep") return Moon;
  if (kind === "exercise") return Activity;
  return Sparkles;
};

export default function BloodPressureInsights({ target }: Props) {
  const [insights, setInsights] = useState<BloodPressureInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 86_400_000);

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
  }, [target]);

  return (
    <section className="mt-3 rounded-[19px] border border-[#dcebed] bg-[#f8fbfc] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e8f8f7] text-[#0b7b80]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Sympto Insights</p>
            <p className="mt-0.5 text-[9px] font-semibold text-[#7d8f9c]">Patterns from your recorded health data</p>
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
          {insights.map((insight) => {
            const Icon = iconFor(insight.kind);
            const warning = insight.tone === "warning";
            return (
              <article
                key={insight.kind}
                className={warning ? "rounded-[15px] border border-amber-200 bg-amber-50 p-3" : "rounded-[15px] border border-[#e1ecef] bg-white p-3"}
              >
                <div className="flex items-start gap-2.5">
                  <span className={warning ? "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800" : "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eef8f8] text-[#0b7b80]"}>
                    {warning ? <AlertTriangle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <p className={warning ? "text-[10px] font-black text-amber-950" : "text-[10px] font-black text-[#0b2d54]"}>{insight.title}</p>
                    <p className={warning ? "mt-1 text-[10px] leading-5 text-amber-900/85" : "mt-1 text-[10px] leading-5 text-[#6f818d]"}>{insight.body}</p>
                    {insight.evidence && (
                      <p className={warning ? "mt-1.5 text-[8px] font-black uppercase tracking-[.11em] text-amber-800/80" : "mt-1.5 text-[8px] font-black uppercase tracking-[.11em] text-[#91a2ad]"}>
                        {insight.evidence}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[8px] leading-4 text-[#97a5ae]">
        <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0" />
        These are observations from your records, not a diagnosis or proof that one factor caused another.
      </p>
    </section>
  );
}
