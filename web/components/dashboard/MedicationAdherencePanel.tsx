"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Flame, Target } from "lucide-react";
import { api } from "@/lib/api";

type Summary = { adherencePercent: number; currentStreak: number; taken: number; skipped: number; total: number; needsReminderAdjustment: boolean };
type Goal = { id: string; title: string; targetPercent: number; progressPercent: number; adherencePercent: number; achieved: boolean };

export default function MedicationAdherencePanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    Promise.all([api.get("/medication-adherence/summary?days=30"), api.get("/medication-adherence/goals")])
      .then(([summaryResponse, goalsResponse]) => {
        setSummary(summaryResponse.data?.data ?? summaryResponse.data);
        setGoals(goalsResponse.data?.data ?? goalsResponse.data ?? []);
      })
      .catch(() => undefined);
  }, []);

  if (!summary) return null;

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-[#24c1c4]">Active intervention</p><h2 className="mt-1 text-lg font-bold text-[#0b2d54]">Medication adherence</h2><p className="mt-1 text-sm text-slate-500">Your last 30 days, updated from every dose you log.</p></div>
      <div className="flex gap-5"><div className="text-center"><p className="text-2xl font-bold text-[#0b2d54]">{summary.adherencePercent}%</p><p className="text-[11px] text-slate-500">adherence</p></div><div className="text-center"><p className="flex items-center gap-1 text-2xl font-bold text-[#0b2d54]"><Flame className="h-5 w-5" />{summary.currentStreak}</p><p className="text-[11px] text-slate-500">day streak</p></div></div>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: `${Math.min(100, summary.adherencePercent)}%` }} /></div>
    <p className="mt-2 text-xs text-slate-500">{summary.taken} taken · {summary.skipped} skipped · {summary.total} logged doses</p>
    {summary.needsReminderAdjustment && <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Your adherence is below 80%. Consider moving reminders to a time that better fits your routine.</span></div>}
    {goals.length > 0 && <div className="mt-5 space-y-3"><p className="flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><Target className="h-4 w-4" /> Goals</p>{goals.map((goal) => <div key={goal.id}><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-slate-700">{goal.title}</span><span className="text-slate-500">{goal.adherencePercent}% / {goal.targetPercent}%</span></div><div className="mt-1.5 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0b2d54]" style={{ width: `${Math.min(100, goal.progressPercent)}%` }} /></div></div>)}</div>}
  </section>;
}
