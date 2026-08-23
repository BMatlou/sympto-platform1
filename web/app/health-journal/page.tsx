"use client";

import Link from "next/link";
import { Activity, ArrowLeft, CalendarDays, HeartPulse, ShieldCheck, Sparkles, Target, Watch } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function formatDate(value: unknown) {
  if (!value) return "Not available";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function text(value: unknown) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default function HealthJournalPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#F8FAFC] p-6"><div className="mx-auto max-w-3xl animate-pulse space-y-4"><div className="h-10 w-80 rounded-xl bg-slate-200" /><div className="h-64 rounded-2xl bg-white" /><div className="h-48 rounded-2xl bg-white" /></div></main></ProtectedRoute>;

  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#F8FAFC] p-6"><div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-6"><h1 className="text-xl font-bold text-slate-900">Your journal could not be loaded</h1><button onClick={reload} className="mt-4 rounded-xl bg-[#0B5CAD] px-4 py-2 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

  const { patient, healthSnapshot, today, goals, family, wearables, attention } = data;
  const latest = wearables.latestMeasurements;
  const nextAppointment = today.upcomingAppointments[0] as Record<string, unknown> | undefined;

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-100 bg-white"><div className="mx-auto flex h-16 max-w-4xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0B5CAD]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link></div></header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6"><div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3FB] px-2.5 py-1 text-xs font-semibold text-[#0B5CAD]"><Sparkles className="h-3.5 w-3.5" />Smart Health Journal</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Your health story, built for you</h1><p className="mt-2 text-sm leading-6 text-slate-500">Hi {patient.firstName}. Sympto continuously compiles your health activity. There is nothing for you to type into this journal.</p></div>

        <section className="mb-6 overflow-hidden rounded-2xl border border-[#CFE3F5] bg-white shadow-sm"><div className="bg-gradient-to-r from-[#EAF3FB] to-white p-6"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5CAD] shadow-sm"><Sparkles className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">Today's automatic health summary</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">No typing required</span></div><p className="mt-1 text-sm text-slate-500">Generated from authorised information already in Sympto.</p></div></div></div><div className="space-y-3 p-6">
          {latest.length > 0 && <p className="text-sm leading-6 text-slate-700">Sympto has collected {latest.length} recent connected-device measurements for your health timeline. Your connected devices currently provide measurements such as {latest.slice(0, 4).map((item) => item.type.toLowerCase().replace(/_/g, " ")).join(", ")}.</p>}
          {today.activeMedications.length > 0 && <p className="text-sm leading-6 text-slate-700">Your health file currently contains {today.activeMedications.length} active medication{today.activeMedications.length === 1 ? "" : "s"}.</p>}
          {nextAppointment && <p className="text-sm leading-6 text-slate-700">You have an upcoming appointment on {formatDate(nextAppointment.scheduledStart)}.</p>}
          {goals.length > 0 && <p className="text-sm leading-6 text-slate-700">Sympto is following {goals.length} active health goal{goals.length === 1 ? "" : "s"} and can use recorded progress to help keep you on track.</p>}
          {latest.length === 0 && today.activeMedications.length === 0 && !nextAppointment && goals.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">There is not enough new activity to add to today's summary yet. As you use Sympto and connect authorised health sources, this journal will build automatically.</p>}
          <p className="pt-2 text-xs text-slate-400">Last compiled {formatDate(data.generatedAt)}</p>
        </div></section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Watch className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-900">Connected data</h2><p className="text-xs text-slate-400">Automatically collected</p></div></div><div className="mt-4 space-y-2">{wearables.devices.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No connected devices yet.</p> : wearables.devices.map((device) => <div key={String(device.id)} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{text(device.manufacturer)} {text(device.model)}</p><p className="mt-1 text-xs text-slate-400">{text(device.status)} · last sync {formatDate(device.lastSyncAt)}</p></div>)}</div></section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Activity className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-900">Latest measurements</h2><p className="text-xs text-slate-400">Part of your health timeline</p></div></div><div className="mt-4 space-y-2">{latest.slice(0, 5).map((measurement) => <div key={measurement.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-800">{measurement.type}</p><p className="text-[11px] text-slate-400">{formatDate(measurement.measuredAt)}</p></div><p className="text-sm font-bold text-slate-900">{text(measurement.value)} {measurement.unit}</p></div>)}</div></section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><HeartPulse className="h-5 w-5 text-[#0B5CAD]" /><div><h2 className="font-bold text-slate-900">Health context</h2><p className="text-xs text-slate-400">Already in your health file</p></div></div><div className="mt-4 space-y-2 text-sm"><p>Active conditions: <b>{healthSnapshot.activeConditions.length}</b></p><p>Allergies: <b>{healthSnapshot.allergies.length}</b></p><p>Active medications: <b>{today.activeMedications.length}</b></p><p>Family members managed: <b>{family.length}</b></p></div></section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-[#0B5CAD]" /><div><h2 className="font-bold text-slate-900">Goal tracking</h2><p className="text-xs text-slate-400">Progress comes from recorded activity</p></div></div><div className="mt-4 space-y-3">{goals.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active goals yet.</p> : goals.slice(0, 4).map((goal) => { const progress = Array.isArray(goal.progress) ? goal.progress[goal.progress.length - 1] as Record<string, unknown> | undefined : undefined; const percent = Math.min(100, Math.max(0, Number(progress?.progressPercent) || 0)); return <div key={String(goal.id)}><div className="flex justify-between text-sm"><span className="font-medium text-slate-800">{text(goal.title)}</span><span className="text-slate-500">{percent}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0B5CAD]" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
        </div>

        {attention.length > 0 && <section className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-6"><h2 className="font-bold text-slate-900">Important signals</h2><div className="mt-3 space-y-2">{attention.slice(0, 3).map((item, index) => <div key={`${item.type}-${index}`}><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-600">{item.description}</p></div>)}</div></section>}

        <div className="mt-6 flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400"><ShieldCheck className="h-4 w-4" />Your journal is generated from your existing authorised Sympto health data.</div>
      </div>
    </main>
  </ProtectedRoute>;
}
