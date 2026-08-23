"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Target } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function formatEnum(value: unknown) { if (!value) return "Not specified"; return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: unknown) { if (!value) return "Not specified"; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return String(value); return date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }

export default function HealthGoalsPage() {
  const { data: dashboard, loading, error, reload } = useDashboard();
  const healthGoals = Array.isArray(dashboard?.goals) ? dashboard.goals : [];
  const activeHealthGoals = healthGoals.filter((goal: any) => goal?.status === "ACTIVE");

  return <ProtectedRoute><main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link></div></header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Target className="h-3.5 w-3.5" />Health goals</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Your health goals</h1><p className="mt-2 max-w-2xl text-slate-500">Keep track of the health goals you are working towards.</p></div><Link href="/onboarding" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]"><Plus className="h-4 w-4" />Add health goal</Link></div>
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your health goals...</div>}
      {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your goals</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
      {!loading && !error && activeHealthGoals.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-7 w-7" /></div><h2 className="mt-5 text-lg font-semibold text-[#0b2d54]">No active health goals</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Your Health Home currently has no active goals to display.</p><Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add your first goal</Link></div>}
      {activeHealthGoals.length > 0 && <div className="space-y-4">{activeHealthGoals.map((goal: any) => <div key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-[#0b2d54]">{goal?.title || "Health goal"}</h2>{goal?.priority && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">{formatEnum(goal.priority)}</span>}<span className="inline-flex items-center gap-1 rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2d54]"><CheckCircle2 className="h-3 w-3" />Active</span></div>{goal?.description && <p className="mt-2 text-sm leading-6 text-slate-500">{goal.description}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{goal?.targetValue !== undefined && goal?.targetValue !== null && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">Target</p><p className="mt-1 font-semibold text-[#0b2d54]">{goal.targetValue} {goal?.unit || ""}</p></div>}{goal?.targetDate && <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /><p className="text-xs font-medium text-slate-400">Target date</p></div><p className="mt-1 font-semibold text-[#0b2d54]">{formatDate(goal.targetDate)}</p></div>}</div></div></div></div>)}</div>}
    </div>
  </main></ProtectedRoute>;
}
