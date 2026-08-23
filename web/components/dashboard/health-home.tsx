"use client";

import Link from "next/link";
import { Activity, CalendarDays, CheckCircle2, ChevronRight, HeartPulse, LucideIcon, Pill, Sparkles, Target, Users, Watch, TriangleAlert } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Card({ title, icon: Icon, href, children }: { title: string; icon: LucideIcon; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF3FB] text-[#0B5CAD]"><Icon className="h-4 w-4" /></span><h2 className="font-semibold text-slate-950">{title}</h2></div>{href && <Link href={href} className="text-xs font-semibold text-[#0B5CAD]">View all</Link>}</div>
      {children}
    </section>
  );
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#F7F9FC] p-6 sm:p-10"><div className="mx-auto max-w-7xl space-y-6"><div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div></div></main></ProtectedRoute>;

  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#F7F9FC] p-6 sm:p-10"><div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6"><h1 className="text-xl font-bold text-slate-950">We couldn't load your Health Home</h1><p className="mt-2 text-sm text-slate-500">Your health data has not been changed. Please try again.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0B5CAD] px-4 py-2 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

  const { patient, healthSnapshot, today, goals, family, wearables, attention } = data;
  const findMeasurement = (type: string) => wearables.latestMeasurements.find((item) => item.type === type);
  const steps = findMeasurement("STEPS");
  const heartRate = findMeasurement("HEART_RATE");
  const sleep = findMeasurement("SLEEP");
  const nextAppointment = today.upcomingAppointments[0] as Record<string, unknown> | undefined;

  const wearableMetric = (label: string, measurement?: { value: number | string; unit: string }) => (
    <div key={label} className="rounded-xl bg-slate-50 p-2 text-center"><p className="text-[10px] font-medium text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-800">{measurement ? `${text(measurement.value)} ${measurement.unit}` : "—"}</p></div>
  );

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><img src="/logo-navbar.png" alt="Sympto" className="h-12 w-auto" /><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Health Home</span></div></header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header><p className="text-sm font-semibold text-[#0B5CAD]">MY HEALTH</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Good morning, {patient.firstName}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Sympto brings your health information, goals, care and connected devices together in one place.</p></header>
        {attention.length > 0 && <Card title="Needs your attention" icon={TriangleAlert}><div className="space-y-3">{attention.slice(0, 3).map((item, index) => <div key={`${item.type}-${index}`} className="rounded-xl bg-amber-50 p-3"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.description}</p></div>)}</div></Card>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Health snapshot" icon={HeartPulse} href="/health-passport"><div className="space-y-2 text-sm"><p><span className="text-slate-500">Conditions:</span> <b>{healthSnapshot.activeConditions.length}</b></p><p><span className="text-slate-500">Allergies:</span> <b>{healthSnapshot.allergies.length}</b></p><p><span className="text-slate-500">Blood type:</span> <b>{text(healthSnapshot.bloodType)}</b></p></div></Card>
          <Card title="Medication" icon={Pill} href="/medications"><p className="text-3xl font-bold text-slate-950">{today.activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">active medications</p></Card>
          <Card title="Appointments" icon={CalendarDays} href="/appointments">{nextAppointment ? <div><p className="text-sm font-semibold text-slate-900">Next appointment</p><p className="mt-1 text-sm text-slate-600">{formatDate(nextAppointment.scheduledStart)}</p></div> : <p className="text-sm text-slate-500">Nothing scheduled yet.</p>}</Card>
          <Card title="Goals" icon={Target} href="/health-goals"><p className="text-3xl font-bold text-slate-950">{goals.length}</p><p className="mt-1 text-sm text-slate-500">active health goals</p></Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Your connected health" icon={Watch}>{wearables.devices.length === 0 ? <div><p className="text-sm text-slate-500">No wearable is connected yet.</p><p className="mt-2 text-xs text-slate-400">When you connect one, Sympto can use authorised measurements to support your health journey.</p></div> : <div className="space-y-3"><p className="text-sm font-medium text-slate-900">{wearables.devices.length} connected device{wearables.devices.length === 1 ? "" : "s"}</p><div className="grid grid-cols-3 gap-2">{wearableMetric("Steps", steps)}{wearableMetric("Heart", heartRate)}{wearableMetric("Sleep", sleep)}</div></div>}</Card>
          <Card title="My goals" icon={Target} href="/health-goals">{goals.length === 0 ? <p className="text-sm text-slate-500">No active goals yet.</p> : <div className="space-y-3">{goals.slice(0, 3).map((goal) => { const progress = Array.isArray(goal.progress) ? goal.progress[goal.progress.length - 1] as Record<string, unknown> | undefined : undefined; const percent = Math.min(100, Math.max(0, Number(progress?.progressPercent) || 0)); return <div key={String(goal.id)}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-800">{text(goal.title)}</span><span className="text-slate-500">{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0B5CAD]" style={{ width: `${percent}%` }} /></div></div>; })}</div>}</Card>
          <Card title="Family" icon={Users}>{family.length === 0 ? <p className="text-sm text-slate-500">No family members are being managed yet.</p> : <div className="space-y-2">{family.slice(0, 4).map((member) => <div key={String(member.id)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-sm font-medium text-slate-800">{text(member.name)}</p><p className="text-xs text-slate-500">{text(member.relationship)}</p></div>{member.canReceiveAlerts && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</div>)}</div>}</Card>
        </div>
        <section className="rounded-2xl border border-[#CFE3F5] bg-gradient-to-r from-[#EAF3FB] to-white p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-[#0B5CAD]" /><div><h2 className="font-semibold text-slate-950">Your health assistant</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Sympto can turn your authorised health activity into useful summaries, reminders, goal support and questions to discuss with your healthcare professional.</p></div></div><Link href="/health-journal" className="inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white">View health journal <ChevronRight className="h-4 w-4" /></Link></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#0B5CAD]" /><h2 className="font-semibold text-slate-950">Recent health activity</h2></div><p className="mt-2 text-xs text-slate-400">Last generated {formatDate(data.generatedAt)}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{wearables.latestMeasurements.slice(0, 4).map((measurement) => <div key={measurement.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">{measurement.type}</p><p className="mt-1 font-semibold text-slate-900">{text(measurement.value)} {measurement.unit}</p><p className="mt-1 text-[11px] text-slate-400">{formatDate(measurement.measuredAt)}</p></div>)}</div></section>
      </div>
    </main>
  </ProtectedRoute>;
}
