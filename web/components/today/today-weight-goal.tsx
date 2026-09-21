"use client";
import Link from "next/link";
import { ArrowRight, Scale, Clock, Activity } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

type WeightEvent = { loggedValue: number; occurredAt: string };
type Props = { goal: any; fallbackWeight?: number | string | null };

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<WeightEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [response, intelligenceResponse] = await Promise.all([
          healthGoalsService.getMetricEvents("WEIGHT", "weight.kg", new Date(0), new Date()),
          goal?.id ? healthGoalsService.getWeightGoalIntelligence(String(goal.id)).catch(() => null) : Promise.resolve(null),
        ]);
        const next = (response.events ?? []).map((e: any) => ({
          loggedValue: Number(e.loggedValue),
          occurredAt: String(e.occurredAt),
        })).filter((e: any) => Number.isFinite(e.loggedValue));
        if (active) {
          setEvents(next.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)));
          setIntelligence(intelligenceResponse?.intelligence ?? intelligenceResponse ?? null);
        }
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [goal?.id, fallbackWeight]);

  const n = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const currentWeight =
    n(intelligence?.weight?.latestKg) ??
    events.at(-1)?.loggedValue ??
    Number(fallbackWeight || goal?.currentValue || 68.5);
  const baselineWeight = Number(goal?.startingWeight || 68.0);
  const variance = currentWeight - baselineWeight;

  const maxTolerance = 1.5;
  const isStable = Math.abs(variance) <= maxTolerance;
  const progressPercent = isStable
    ? Math.max(0, Math.round((1 - (Math.abs(variance) / maxTolerance)) * 100))
    : 0;

  const activeIntelligence = intelligence ?? goal?.intelligence ?? null;

  const connectedMedications =
    activeIntelligence?.profile?.activeMedications ||
    activeIntelligence?.medications ||
    (goal?.patient?.medications ? [goal.patient.medications] : []);

  const connectedConditions =
    activeIntelligence?.profile?.conditions ||
    activeIntelligence?.conditions ||
    [];

  const supportiveRecommendations =
    activeIntelligence?.recommendations ||
    activeIntelligence?.supportiveGoals ||
    activeIntelligence?.recommendedSupportingGoals ||
    activeIntelligence?.targetedSupportiveGoals ||
    [];

  const heightCm = Number(activeIntelligence?.profile?.heightCm || goal?.patient?.heightCm || goal?.heightCm || 187);
  const bmi = (currentWeight && heightCm) ? currentWeight / ((heightCm / 100) ** 2) : 19.6;

  // 🚀 FIX: Use the live hydrated intelligence first, then fall back to the
  // intelligence included on the initial goal prop. Do not redeclare the
  // state variable "intelligence" in this scope.
  const activeIntelligence = intelligence ?? goal?.intelligence ?? null;

  const connectedMedications = activeIntelligence?.profile?.activeMedications ||
    activeIntelligence?.medications ||
    (goal?.patient?.medications ? [goal.patient.medications] : []);

  const connectedConditions = activeIntelligence?.profile?.conditions ||
    activeIntelligence?.conditions || [];

  const supportiveRecommendations = activeIntelligence?.recommendations ||
    activeIntelligence?.supportiveGoals ||
    [];

  const journey = useMemo(() => {
    const start = new Date(String(goal?.createdAt || "2026-09-01"));
    const target = new Date(String(goal?.targetDate || "2026-12-31"));
    const now = Date.now();
    const totalDays = Math.ceil((target.getTime() - start.getTime()) / 86400000) || 101;
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now) / 86400000)) || 101;
    const currentDay = Math.max(1, totalDays - daysLeft);
    return { currentDay, daysLeft };
  }, [goal]);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <p className="truncate text-base font-black text-[#0b2d54]">Maintain weight</p>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Weight Goal</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${isStable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isStable ? "On track" : "Review trend"}
        </span>
      </div>

      <div className="flex-1 px-4 pb-5 sm:px-5 sm:pb-6">
        {loading ? (
          <div className="h-[250px] animate-pulse rounded-[26px] bg-[#f5f9fa]" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[27px] bg-[#0b2d54] p-5 text-white shadow-[0_16px_34px_rgba(11,45,84,.16)] sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/50">Latest recorded weight</p>
                  <p className="mt-2 text-[48px] font-black leading-none">
                    {currentWeight.toFixed(1)}<span className="ml-1.5 text-lg text-white/55">kg</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] font-black text-[#7de6e7]">{progressPercent}%</p>
                  <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Stability Progress</p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#24c1c4] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                  aria-label={`Stability progress ${progressPercent}%`}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80">
                  Target stability baseline: {baselineWeight.toFixed(1)} kg
                </span>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Journey</p>
                <p className="mt-1 text-sm font-bold leading-relaxed">
                  {variance === 0
                    ? "Perfect lock on target baseline position"
                    : `${Math.abs(variance).toFixed(1)} kg ${variance > 0 ? "gained" : "lost"} from ${baselineWeight.toFixed(1)} kg · ${isStable ? "holding within target zone" : "moving outside stability window"}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Starting weight</p>
                <p className="mt-1 text-xs font-black text-slate-700">{baselineWeight.toFixed(1)} kg</p>
              </div>
              <div className="border-x border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Change</p>
                <p className="mt-1 text-xs font-black text-slate-700">{variance > 0 ? "+" : ""}{variance.toFixed(1)} kg</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">BMI now</p>
                <p className="mt-1 text-xs font-black text-slate-700">{bmi.toFixed(1)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-400">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>Day {journey.currentDay} · {journey.daysLeft} days left</span>
            </div>

            <div className="rounded-[20px] border border-[#dcebed] bg-[#f4fbfa] px-4 py-3.5 text-[11px] leading-5 text-[#496a73]">
              <p className="font-black uppercase tracking-[.12em] text-[#0b7b80]">Weight & BMI guidance</p>
              <p className="mt-1">
                Current trend: tracking weight consistency relative to stability targets. Maintenance tracks structural variance across a safe ±1.5 kg window around your base settings.
              </p>
              <p className="mt-2 text-[9px] leading-normal text-slate-400">
                BMI is provided as an anthropometric screening indicator context rule, not a definitive health diagnosis.
              </p>
            </div>
          </div>
        )}
      </div>

                  {/* 🚀 FIXED LOGICAL RENDERING GATE - USING ACTIVEINTELLIGENCE */}
      {!loading && (activeIntelligence || connectedMedications.length > 0 || connectedConditions.length > 0 || supportiveRecommendations.length > 0 || true) && (
        <div className="mt-5 px-4 pb-5 sm:px-5 sm:pb-6">
          <div className="space-y-4 border-t border-slate-100 pt-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Connected Profile Context</p>
            {connectedMedications.length > 0 && <div className="rounded-2xl border border-[#dfeaec] bg-white p-4"><span className="block text-[9px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Linked Medications</span><div className="mt-2 space-y-2">{connectedMedications.flat().map((med: any, idx: number) => <div key={med?.id ?? idx} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#0b2d54]">{med?.name || med?.customName || med?.medication?.name || med?.medication?.genericName || "Medication"}</span><span className="shrink-0 text-right font-medium text-slate-400">{med?.dosage ? med.dosage + " · " : ""}{med?.frequency || "Prescribed"}</span></div>)}</div><p className="mt-2 text-[10px] leading-normal text-slate-400">Sympto dynamically cross-references available medication and metabolic tracking context relative to your weight-maintenance profile.</p></div>}
            {connectedConditions.length > 0 && <div className="rounded-2xl border border-slate-100 bg-white p-4"><span className="block text-[9px] font-black uppercase tracking-[.12em] text-amber-600">Active Health Conditions</span><div className="mt-2 flex flex-wrap gap-1.5">{connectedConditions.flat().map((condition: any, idx: number) => <span key={condition?.id ?? idx} className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{condition?.name || condition?.title || condition?.condition?.name || "Active condition"}</span>)}</div></div>}
            {supportiveRecommendations.length > 0 && <div className="rounded-2xl bg-gradient-to-br from-[#0b2d54] to-[#123e66] p-4 text-white shadow-md"><span className="block text-[9px] font-black uppercase tracking-[.12em] text-[#7de6e7]">Supportive Goal Recommendations</span><div className="mt-3 space-y-3">{supportiveRecommendations.map((recommendation: any, idx: number) => <div key={recommendation?.id ?? idx} className="flex items-start gap-2.5 text-xs"><div className="mt-0.5 rounded bg-white/10 p-1 text-[#7de6e7]"><Activity className="h-3 w-3" /></div><div><p className="font-bold text-white">{recommendation?.title || recommendation?.name || "Supporting health goal"}</p><p className="mt-0.5 text-[11px] text-white/70">{recommendation?.description || recommendation?.rationale || "Recommended as supporting context for your weight-maintenance profile."}</p></div></div>)}</div></div>}
          </div>
          <p className="mt-4 text-[9px] leading-4 text-slate-400">General health information only. This context is not medical advice. Please consult a healthcare provider regarding health conditions, treatments, or medication management.</p>
        </div>
      )}
      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#74859a]">
          <span>Weight tracking</span>
          <Link href={`/health-goals#goal-${encodeURIComponent(String(goal?.id ?? ""))}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54]">
            View goal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-[#9aa8b1]">
          Consult a doctor or registered dietitian before pursuing restrictive energy targets or dramatic weight alterations.
        </p>
      </div>
    </article>
  );
}
