"use client";

import Link from "next/link";
import { Activity, CalendarDays, CheckCircle2, ChevronRight, HeartPulse, LucideIcon, Pill, Target, Users, Watch, TriangleAlert } from "lucide-react";
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
  const content = (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition ${href ? "hover:-translate-y-0.5 hover:border-[#24c1c4]/40 hover:shadow-md focus-within:ring-2 focus-within:ring-[#24c1c4]/30" : ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-4 w-4" /></span>
          <h2 className="font-semibold text-[#0b2d54]">{title}</h2>
        </div>
        {href && <span className="text-xs font-semibold text-[#0b2d54]">View all</span>}
      </div>
      {children}
    </section>
  );
  return href ? <Link href={href} className="block rounded-2xl focus:outline-none">{content}</Link> : content;
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-slate-50 p-6 sm:p-10"><div className="mx-auto max-w-7xl space-y-6" aria-busy="true"><div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div></div></main></ProtectedRoute>;

  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-slate-50 p-6 sm:p-10"><div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your Health Home</h1><p className="mt-2 text-sm text-slate-500">Your health data has not been changed. Please try again.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#071f3a] focus:outline-none focus:ring-2 focus:ring-[#24c1c4]/40">Try again</button></div></main></ProtectedRoute>;

  const { patient, healthSnapshot, today, goals, family, wearables, attention } = data;
  const findMeasurement = (type: string) => wearables.latestMeasurements.find((item) => item.type === type);
  const steps = findMeasurement("STEPS");
  const heartRate = findMeasurement("HEART_RATE");
  const sleep = findMeasurement("SLEEP");
  const nextAppointment = today.upcomingAppointments[0] as Record<string, unknown> | undefined;
  const nextAppointmentTitle = text(nextAppointment?.title || nextAppointment?.type || "Appointment");

  const wearableMetric = (label: string, measurement?: { value: number | string; unit: string }) => (
    <div key={label} className="rounded-xl bg-slate-50 p-2 text-center"><p className="text-[10px] font-medium text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">{measurement ? `${text(measurement.value)} ${measurement.unit}` : "—"}</p></div>
  );

  return <ProtectedRoute>
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><img src="/logo-navbar.png" alt="Sympto" className="h-12 w-auto" /><span className="rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]">Health Home</span></div></header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8">
          <p className="text-sm font-semibold tracking-wide text-[#0b2d54]">MY HEALTH</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0b2d54]">Good morning, {patient.firstName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your health information, care, goals and connected-device activity — brought together automatically.</p>
        </header>

        {attention.length > 0 && <Card title="Needs your attention" icon={TriangleAlert}><div className="space-y-3">{attention.slice(0, 3).map((item, index) => <div key={`${item.type}-${index}`} className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-sm font-semibold text-[#0b2d54]">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p></div>)}</div></Card>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Health snapshot" icon={HeartPulse} href="/health-passport"><div className="space-y-2 text-sm"><p><span className="text-slate-500">Conditions:</span> <b>{healthSnapshot.activeConditions.length}</b></p><p><span className="text-slate-500">Allergies:</span> <b>{healthSnapshot.allergies.length}</b></p><p><span className="text-slate-500">Blood type:</span> <b>{text(healthSnapshot.bloodType)}</b></p></div></Card>
          <Card title="Medication" icon={Pill} href="/medications"><p className="text-3xl font-bold text-[#0b2d54]">{today.activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">active medication{today.activeMedications.length === 1 ? "" : "s"}</p></Card>
          <Card title="Appointments" icon={CalendarDays} href="/appointments">{nextAppointment ? <div><p className="text-sm font-semibold text-[#0b2d54]">{nextAppointmentTitle}</p><p className="mt-1 text-sm text-slate-600">{formatDate(nextAppointment.scheduledStart)}</p></div> : <p className="text-sm text-slate-500">Nothing scheduled yet.</p>}</Card>
          <Card title="Goals" icon={Target} href="/health-goals"><p className="text-3xl font-bold text-[#0b2d54]">{goals.length}</p><p className="mt-1 text-sm text-slate-500">active health goal{goals.length === 1 ? "" : "s"}</p></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Your connected health" icon={Watch}>{wearables.devices.length === 0 ? <div><p className="text-sm text-slate-500">No wearable is connected yet.</p><p className="mt-2 text-xs leading-5 text-slate-400">Once an authorised device is connected, its measurements can become part of your automatic health activity.</p></div> : <div className="space-y-3"><p className="text-sm font-medium text-[#0b2d54]">{wearables.devices.length} connected device{wearables.devices.length === 1 ? "" : "s"}</p><div className="grid grid-cols-3 gap-2">{wearableMetric("Steps", steps)}{wearableMetric("Heart", heartRate)}{wearableMetric("Sleep", sleep)}</div></div>}</Card>
          <Card title="My goals" icon={Target} href="/health-goals">{goals.length === 0 ? <p className="text-sm text-slate-500">No active goals yet.</p> : <div className="space-y-3">{goals.slice(0, 3).map((goal) => { const progress = Array.isArray(goal.progress) ? goal.progress[goal.progress.length - 1] as Record<string, unknown> | undefined : undefined; const percent = Math.min(100, Math.max(0, Number(progress?.progressPercent) || 0)); return <div key={String(goal.id)}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-800">{text(goal.title)}</span><span className="text-slate-500">{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${percent}%` }} /></div></div>; })}</div>}</Card>
          <Card title="Family" icon={Users}>{family.length === 0 ? <p className="text-sm text-slate-500">No family members are being managed yet.</p> : <div className="space-y-2">{family.slice(0, 4).map((member) => <div key={String(member.id)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-sm font-medium text-slate-800">{text(member.name)}</p><p className="text-xs text-slate-500">{text(member.relationship)}</p></div>{member.canReceiveAlerts && <CheckCircle2 className="h-4 w-4 text-[#24c1c4]" aria-label="Can receive alerts" />}</div>)}</div>}</Card>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#24c1c4]" /><div><h2 className="font-semibold text-[#0b2d54]">Recent health activity</h2><p className="text-xs text-slate-400">Automatically collected from your connected health data</p></div></div><p className="mt-2 text-xs text-slate-400">Last updated {formatDate(data.generatedAt)}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{wearables.latestMeasurements.slice(0, 4).map((measurement) => <div key={measurement.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">{measurement.type.replace(/_/g, " ")}</p><p className="mt-1 font-semibold text-[#0b2d54]">{text(measurement.value)} {measurement.unit}</p><p className="mt-1 text-[11px] text-slate-400">{formatDate(measurement.measuredAt)}</p></div>)}{wearables.latestMeasurements.length === 0 && <div className="sm:col-span-2 lg:col-span-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Your recent activity will appear here automatically as authorised health data becomes available.</div>}</div></section>
      </div>
    </main>
  </ProtectedRoute>;
}
