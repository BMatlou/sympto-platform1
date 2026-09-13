"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, LockKeyhole, Plus, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthGoalsService, type HealthGoalSnapshot } from "@/services/health-goals.service";

function formatEnum(value: unknown) {
  if (!value) return "Not specified";
  return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return "Not specified";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function isToday(value: unknown) {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function getGoalPresentation(goal: any, snapshot?: HealthGoalSnapshot) {
  const category = String(goal?.category ?? "").toUpperCase();
  const title = String(goal?.title ?? "").toLowerCase();
  const isWeightLoss = category === "WEIGHT" && (title.includes("lose") || title.includes("weight loss") || title.includes("loss"));
  const current = snapshot?.currentValue ?? goal?.latestProgress?.currentValue ?? goal?.currentValue;
  const targetValue = snapshot?.targetValue ?? goal?.targetValue;
  const unit = snapshot?.unit || goal?.unit || "";
  const rawProgress = snapshot?.currentProgress ?? goal?.latestProgress?.progressPercent ?? goal?.progressPercent ?? 0;
  const achieved = String(goal?.status ?? snapshot?.status ?? "").toUpperCase() === "ACHIEVED";

  if (isWeightLoss && targetValue != null && Number.isFinite(Number(targetValue))) {
    const progressHistory = Array.isArray(goal?.progress) ? goal.progress : [];
    const recordedWeights = progressHistory.map((entry: any) => Number(entry?.currentValue)).filter((value: number) => Number.isFinite(value) && value > 0);
    const startingWeight = recordedWeights.length > 0 ? Math.max(...recordedWeights) : current != null ? Number(current) : null;
    const goalWeight = startingWeight != null ? startingWeight - Number(targetValue) : null;
    const lost = startingWeight != null && current != null ? Math.max(0, startingWeight - Number(current)) : 0;
    const calculatedPercent = achieved ? 100 : Number(targetValue) > 0 && startingWeight != null && current != null ? Math.min(100, Math.max(0, (lost / Number(targetValue)) * 100)) : Number(rawProgress);
    const remaining = Math.max(0, Number(targetValue) - lost);

    return {
      percent: Math.round(calculatedPercent),
      currentLabel: current != null ? `${current} ${unit}`.trim() : "Not recorded",
      targetLabel: goalWeight != null ? `${goalWeight} ${unit}`.trim() : `${targetValue} ${unit}`.trim(),
      summary: achieved ? `${Math.max(lost, Number(targetValue)).toFixed(1).replace(/\.0$/, "")} ${unit} lost — goal completed` : lost > 0 ? `${Math.min(lost, Number(targetValue)).toFixed(1).replace(/\.0$/, "")} ${unit} of ${targetValue} ${unit} lost` : `0 ${unit} of ${targetValue} ${unit} lost`,
      helper: achieved ? "This goal is locked. You can start a new weight-loss goal." : remaining > 0 ? `${remaining.toFixed(1).replace(/\.0$/, "")} ${unit} remaining to reach your goal.` : "You've reached your weight-loss goal. Great work!",
      currentLabelTitle: "Current weight",
      targetLabelTitle: "Goal weight",
      isWeightLoss: true,
    };
  }

  return {
    percent: achieved ? 100 : Math.min(100, Math.max(0, Math.round(Number(rawProgress)))),
    currentLabel: current != null ? `${current} ${unit}`.trim() : null,
    targetLabel: targetValue != null ? `${targetValue} ${unit}`.trim() : null,
    summary: achieved ? "Goal completed" : null,
    helper: achieved ? "This goal is locked. You can start a new health goal." : null,
    currentLabelTitle: "Current",
    targetLabelTitle: "Target",
    isWeightLoss: false,
  };
}

export default function HealthGoalsPage() {
  const { data: dashboard, loading, error, reload } = useDashboard();
  const [snapshots, setSnapshots] = useState<Record<string, HealthGoalSnapshot>>({});
  const [loggingGoalId, setLoggingGoalId] = useState<string | null>(null);
  const [smokingValue, setSmokingValue] = useState("");
  const [savingMetric, setSavingMetric] = useState(false);

  const healthGoals = Array.isArray(dashboard?.goals) ? dashboard.goals : [];
  const visibleHealthGoals = healthGoals.filter((goal: any) => ["ACTIVE", "ON_TRACK", "IMPROVING", "STAGNANT", "ACHIEVED"].includes(String(goal?.status ?? "").toUpperCase()));

  useEffect(() => {
    if (!dashboard) return;
    healthGoalsService.getActiveSnapshot().then((items) => {
      setSnapshots(Object.fromEntries(items.map((item) => [item.id, item])));
    }).catch(() => undefined);
  }, [dashboard]);

  const smokingGoal = useMemo(() => visibleHealthGoals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING"), [visibleHealthGoals]);

  function openSmokingLog(goal: any) {
    const snapshot = snapshots[goal.id];
    const current = snapshot?.todayLogged ? snapshot.todayValue : isToday(goal?.latestProgress?.measuredAt) ? Number(goal?.latestProgress?.currentValue ?? 0) : "";
    setSmokingValue(current === "" ? "" : String(current));
    setLoggingGoalId(goal.id);
  }

  async function saveSmokingLog() {
    const value = Number(smokingValue);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter 0 or more cigarettes.");
      return;
    }

    try {
      setSavingMetric(true);
      const result = await healthGoalsService.logMetric({
        metricType: "SMOKING_CESSATION",
        metricKey: "smoking.cigarettes",
        loggedValue: value,
        metadata: { goalId: loggingGoalId },
      });
      const updated = Array.isArray(result?.updatedGoals) ? result.updatedGoals as HealthGoalSnapshot[] : [];
      setSnapshots((current) => ({ ...current, ...Object.fromEntries(updated.map((item) => [item.id, item])) }));
      await reload();
      toast.success("Today's smoking log was saved.");
      setLoggingGoalId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "We couldn't save today's smoking log.");
    } finally {
      setSavingMetric(false);
    }
  }

  return <ProtectedRoute><main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link><Link href="/health-goals/manage" className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]"><Plus className="h-4 w-4" />Manage health goals</Link></div></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Target className="h-3.5 w-3.5" />Health goals</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Your health goals</h1><p className="mt-2 max-w-2xl text-slate-500">Sympto turns your goals into simple actions you can take today.</p></div>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your health goals...</div>}
      {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your goals</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

      {!loading && !error && visibleHealthGoals.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-7 w-7" /></div><h2 className="mt-5 text-lg font-semibold text-[#0b2d54]">No health goals</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">You don't have any active or completed health goals yet.</p><Link href="/health-goals/manage" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create a health goal</Link></div>}

      {!loading && !error && smokingGoal && (() => {
        const snapshot = snapshots[smokingGoal.id];
        const loggedToday = snapshot?.todayLogged ?? isToday(smokingGoal.latestProgress?.measuredAt);
        const todayValue = snapshot?.todayLogged ? snapshot.todayValue : loggedToday ? Number(smokingGoal.latestProgress?.currentValue ?? 0) : null;
        const target = Number(snapshot?.targetValue ?? smokingGoal.targetValue ?? 0);
        const withinTarget = loggedToday && todayValue != null && (target <= 0 || todayValue <= target);

        return <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#24c1c4]">Today's action</p><h2 className="mt-1 text-xl font-bold text-[#0b2d54]">{smokingGoal.title || "Smoking"}</h2><p className="mt-1 text-sm text-slate-500">Your goal is to keep today's cigarette count at or below {target} {smokingGoal.unit || "cigarettes/day"}.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!loggedToday ? "bg-amber-50 text-amber-700" : withinTarget ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{!loggedToday ? "Not logged today" : withinTarget ? "On target today" : "Above today's target"}</span></div></div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">Today's status</p><p className="mt-1 text-2xl font-bold text-[#0b2d54]">{loggedToday ? `${todayValue} cigarettes` : "Not logged"}</p><p className="mt-1 text-xs text-slate-500">{loggedToday ? (withinTarget ? `${Math.max(0, target - Number(todayValue))} below your target` : `${Math.max(0, Number(todayValue) - target)} above your target`) : "Log your count to start today's tracking."}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">Daily target</p><p className="mt-1 text-2xl font-bold text-[#0b2d54]">≤ {target}</p><p className="mt-1 text-xs text-slate-500">{smokingGoal.unit || "cigarettes/day"}</p></div>
            <div className="rounded-xl bg-[#0b2d54] p-4 text-white"><p className="text-xs font-medium text-white/60">What to do now</p><p className="mt-1 text-sm font-semibold">{loggedToday ? "Keep tracking your day. You can update this log if your count changes." : "Tell Sympto how many cigarettes you have smoked today."}</p><button onClick={() => openSmokingLog(smokingGoal)} className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] hover:bg-slate-100">{loggedToday ? "Update today's log" : "Log today's cigarettes"}</button></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500"><span>Goal date: <b className="text-[#0b2d54]">{formatDate(smokingGoal.targetDate)}</b></span><span>Progress is based on your recorded activity — not a default zero.</span></div>
        </section>;
      })()}

      {visibleHealthGoals.filter((goal: any) => goal.id !== smokingGoal?.id).length > 0 && <div className="space-y-4">{visibleHealthGoals.filter((goal: any) => goal.id !== smokingGoal?.id).map((goal: any) => { const presentation = getGoalPresentation(goal, snapshots[goal.id]); const achieved = String(goal?.status ?? snapshots[goal.id]?.status ?? "").toUpperCase() === "ACHIEVED"; return <div key={goal.id} className={`rounded-2xl border bg-white p-6 ${achieved ? "border-emerald-200" : "border-slate-200"}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-[#0b2d54]">{goal?.title || "Health goal"}</h2>{goal?.priority && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">{formatEnum(goal.priority)}</span>}<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${achieved ? "bg-emerald-50 text-emerald-700" : "bg-[#24c1c4]/10 text-[#0b2d54]"}`}>{achieved ? <LockKeyhole className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{achieved ? "Goal completed" : "Active"}</span></div>{goal?.description && <p className="mt-2 text-sm leading-6 text-slate-500">{goal.description}</p>}<div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-slate-400">Progress</p><p className="mt-1 text-2xl font-bold text-[#0b2d54]">{presentation.percent}% <span className="text-sm font-medium text-slate-400">complete</span></p></div>{presentation.currentLabel && <div className="text-right"><p className="text-xs font-medium text-slate-400">{presentation.currentLabelTitle}</p><p className="mt-1 font-semibold text-[#0b2d54]">{presentation.currentLabel}</p></div>}</div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${presentation.percent}%` }} /></div>{presentation.summary && <p className="mt-3 text-sm font-medium text-[#0b2d54]">{presentation.summary}</p>}{presentation.helper && <p className="mt-1 text-xs leading-5 text-slate-500">{presentation.helper}</p>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{presentation.targetLabel && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">{presentation.targetLabelTitle}</p><p className="mt-1 font-semibold text-[#0b2d54]">{presentation.targetLabel}</p></div>}{goal?.targetDate && <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /><p className="text-xs font-medium text-slate-400">Target date</p></div><p className="mt-1 font-semibold text-[#0b2d54]">{formatDate(goal.targetDate)}</p></div>}</div></div></div></div>; })}</div>}
    </div>

    {loggingGoalId && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#24c1c4]">Daily log</p><h2 className="mt-1 text-xl font-bold text-[#0b2d54]">How many cigarettes today?</h2></div><button onClick={() => setLoggingGoalId(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X className="h-5 w-5" /></button></div><p className="mt-2 text-sm leading-6 text-slate-500">Enter your total for today. Use 0 if you have not smoked any cigarettes.</p><input autoFocus type="number" min="0" step="1" value={smokingValue} onChange={(event) => setSmokingValue(event.target.value)} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-2xl font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" placeholder="0" /><div className="mt-5 flex gap-3"><button onClick={() => setLoggingGoalId(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Cancel</button><button onClick={saveSmokingLog} disabled={savingMetric} className="flex-1 rounded-xl bg-[#0b2d54] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{savingMetric ? "Saving…" : "Save today's log"}</button></div></div></div>}
  </main></ProtectedRoute>;
}
