"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Target, LockKeyhole } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function formatEnum(value: unknown) { if (!value) return "Not specified"; return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: unknown) { if (!value) return "Not specified"; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return String(value); return date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }

function getGoalPresentation(goal: any) {
  const category = String(goal?.category ?? "").toUpperCase();
  const title = String(goal?.title ?? "").toLowerCase();
  const isWeightLoss = category === "WEIGHT" && (title.includes("lose") || title.includes("weight loss") || title.includes("loss"));
  const current = goal?.latestValue != null ? Number(goal.latestValue) : null;
  const targetValue = goal?.targetValue != null ? Number(goal.targetValue) : null;
  const unit = goal?.unit || "";
  const rawProgress = Number(goal?.progressPercent) || 0;
  const achieved = String(goal?.status ?? "").toUpperCase() === "ACHIEVED";

  if (isWeightLoss && targetValue != null && Number.isFinite(targetValue)) {
    const progressHistory = Array.isArray(goal?.progress) ? goal.progress : [];
    const recordedWeights = progressHistory.map((entry: any) => Number(entry?.currentValue)).filter((value: number) => Number.isFinite(value) && value > 0);
    const startingWeight = recordedWeights.length > 0 ? Math.max(...recordedWeights) : current;
    const goalWeight = startingWeight != null ? startingWeight - targetValue : null;
    const lost = startingWeight != null && current != null ? Math.max(0, startingWeight - current) : 0;
    const calculatedPercent = achieved ? 100 : targetValue > 0 && startingWeight != null && current != null ? Math.min(100, Math.max(0, (lost / targetValue) * 100)) : Math.min(100, Math.max(0, rawProgress));
    const percent = Math.round(calculatedPercent);
    const aboveStart = startingWeight != null && current != null && current > startingWeight;
    const remaining = Math.max(0, targetValue - lost);

    return { percent, currentLabel: current != null ? `${current} ${unit}`.trim() : "Not recorded", targetLabel: goalWeight != null ? `${goalWeight} ${unit}`.trim() : `${targetValue} ${unit}`.trim(), summary: achieved ? `${Math.max(lost, targetValue).toFixed(1).replace(/\.0$/, "")} ${unit} lost — goal completed` : lost > 0 ? `${Math.min(lost, targetValue).toFixed(1).replace(/\.0$/, "")} ${unit} of ${targetValue} ${unit} lost` : aboveStart ? `${(current - startingWeight).toFixed(1).replace(/\.0$/, "")} ${unit} above your starting weight` : `0 ${unit} of ${targetValue} ${unit} lost`, helper: achieved ? `You reached your target of losing ${targetValue} ${unit}. This goal is locked. You can start a new weight-loss goal.` : aboveStart ? "Your progress stays at 0% until you get back to your starting weight." : remaining > 0 ? `${remaining.toFixed(1).replace(/\.0$/, "")} ${unit} remaining to reach your goal.` : "You've reached your weight-loss goal. Great work!", currentLabelTitle: "Current weight", targetLabelTitle: "Goal weight", isWeightLoss: true };
  }

  return { percent: achieved ? 100 : Math.min(100, Math.max(0, Math.round(rawProgress))), currentLabel: goal?.latestValue != null ? `${goal.latestValue} ${unit}`.trim() : null, targetLabel: targetValue != null ? `${goal.targetValue} ${unit}`.trim() : null, summary: achieved ? "Goal completed" : null, helper: achieved ? "This goal is locked. You can start a new health goal." : null, currentLabelTitle: "Current", targetLabelTitle: "Target", isWeightLoss: false };
}

export default function HealthGoalsPage() {
  const { data: dashboard, loading, error, reload } = useDashboard();
  const healthGoals = Array.isArray(dashboard?.goals) ? dashboard.goals : [];
  const visibleHealthGoals = healthGoals.filter((goal: any) => ["ACTIVE", "ON_TRACK", "IMPROVING", "STAGNANT", "ACHIEVED"].includes(String(goal?.status ?? "").toUpperCase()));

  return <ProtectedRoute><main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link></div></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Target className="h-3.5 w-3.5" />Health goals</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Your health goals</h1><p className="mt-2 max-w-2xl text-slate-500">Keep track of the health goals you are working towards.</p></div><Link href="/onboarding" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]"><Plus className="h-4 w-4" />Manage health goals</Link></div>
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your health goals...</div>}
      {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your goals</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
      {!loading && !error && visibleHealthGoals.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-7 w-7" /></div><h2 className="mt-5 text-lg font-semibold text-[#0b2d54]">No health goals</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">You don't have any active or completed health goals yet.</p><Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create a health goal</Link></div>}
      {visibleHealthGoals.length > 0 && <div className="space-y-4">{visibleHealthGoals.map((goal: any) => { const presentation = getGoalPresentation(goal); const percent = presentation.percent; const achieved = String(goal?.status ?? "").toUpperCase() === "ACHIEVED"; return <div key={goal.id} className={`rounded-2xl border bg-white p-6 ${achieved ? "border-emerald-200" : "border-slate-200"}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-[#0b2d54]">{goal?.title || "Health goal"}</h2>{goal?.priority && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">{formatEnum(goal.priority)}</span>}<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${achieved ? "bg-emerald-50 text-emerald-700" : "bg-[#24c1c4]/10 text-[#0b2d54]"}`}>{achieved ? <LockKeyhole className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{achieved ? "Goal completed" : "Active"}</span></div>
        {goal?.description && <p className="mt-2 text-sm leading-6 text-slate-500">{goal.description}</p>}
        {presentation.isWeightLoss && <p className="mt-2 text-sm leading-6 text-slate-500">Work toward losing {goal.targetValue} {goal.unit || "kg"} to support your health and build self-confidence.</p>}
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-slate-400">Progress</p><p className="mt-1 text-2xl font-bold text-[#0b2d54]">{percent}% <span className="text-sm font-medium text-slate-400">complete</span></p></div>{presentation.currentLabel && <div className="text-right"><p className="text-xs font-medium text-slate-400">{presentation.currentLabelTitle}</p><p className="mt-1 font-semibold text-[#0b2d54]">{presentation.currentLabel}</p></div>}</div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>{presentation.summary && <p className="mt-3 text-sm font-medium text-[#0b2d54]">{presentation.summary}</p>}{presentation.helper && <p className="mt-1 text-xs leading-5 text-slate-500">{presentation.helper}</p>}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{presentation.targetLabel && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">{presentation.targetLabelTitle}</p><p className="mt-1 font-semibold text-[#0b2d54]">{presentation.targetLabel}</p>{presentation.isWeightLoss && <p className="mt-1 text-xs text-slate-500">Your desired weight after losing {goal.targetValue} {goal.unit || "kg"}.</p>}</div>}{goal?.targetDate && <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /><p className="text-xs font-medium text-slate-400">Target date</p></div><p className="mt-1 font-semibold text-[#0b2d54]">{formatDate(goal.targetDate)}</p></div>}</div>
      </div></div></div>; })}</div>}
    </div>
  </main></ProtectedRoute>;
}
