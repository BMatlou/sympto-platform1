"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, FolderOpen, HeartPulse, Pill, Scale, ShieldCheck, TriangleAlert, Watch } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function measurementValue(measurements: Array<Record<string, unknown>> | undefined, types: string[]) {
  return measurements?.find((item) => types.includes(String(item.type ?? item.measurementType ?? "").toUpperCase()));
}

function bmiPosition(category?: string | null, bmi?: number | null): number {
  const normalized = String(category ?? "").toUpperCase();
  if (normalized.includes("UNDER") || normalized.includes("LOW")) return 17;
  if (normalized.includes("OVER") || normalized.includes("HIGH") || normalized.includes("OBES")) return 83;
  if (bmi != null) return Math.min(82, Math.max(18, ((bmi - 18.5) / 6.5) * 64 + 18));
  return 50;
}

function LargeAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#0b2d54] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
      {icon}{label}
    </Link>
  );
}

function CountPill({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-[#0b2d54] shadow-sm ring-1 ring-slate-100">{icon}<span className="text-base font-extrabold">{count}</span><span className="text-sm font-semibold">{label}</span></div>;
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-5xl space-y-5" aria-busy="true"><div className="h-40 animate-pulse rounded-[32px] bg-white" />{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-[32px] bg-white" />)}</div></main></ProtectedRoute>;

  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[32px] border border-red-200 bg-white p-7 shadow-sm"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><TriangleAlert className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-bold text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-base leading-7 text-slate-500">Your health information has not been changed. Please try again.</p><button onClick={reload} className="mt-6 min-h-12 rounded-2xl bg-[#0b2d54] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#071f3a]">Try again</button></div></main></ProtectedRoute>;

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const activeGoals = (data.goals ?? []).filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length;
  const attentionCount = data.attention?.length ?? 0;
  const conditions = data.healthSnapshot?.activeConditions ?? [];
  const allergies = data.healthSnapshot?.allergies ?? [];
  const immunizations = data.healthSnapshot?.immunizations ?? [];
  const measurements = data.healthSnapshot?.latestMeasurements ?? [];
  const watchMeasurements = data.wearables?.latestMeasurements ?? [];
  const devices = data.wearables?.devices ?? [];
  const bloodPressure = measurementValue(measurements, ["BLOOD_PRESSURE", "BP"]);
  const watchHeart = measurementValue(watchMeasurements as Array<Record<string, unknown>>, ["HEART_RATE", "HEART"]);
  const fallbackHeart = measurementValue(measurements, ["HEART_RATE", "HEART"]);
  const heart = watchHeart ?? fallbackHeart;
  const bpValue = bloodPressure ? `${display(bloodPressure.value)} ${display(bloodPressure.unit)}` : "—";
  const heartValue = heart ? `${display(heart.value)} ${display(heart.unit)}` : "—";
  const bmi = data.healthSnapshot?.bmi;
  const bmiCategory = data.healthSnapshot?.bmiCategory;
  const bmiMarker = bmiPosition(bmiCategory, bmi);
  const watchConnected = devices.length > 0;

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between px-4 sm:px-6"><img src="/logo-navbar.png" alt="Sympto" className="h-11 w-auto" /><span className="rounded-full bg-[#0b2d54]/5 px-4 py-2 text-sm font-extrabold text-[#0b2d54]">My Health</span></div></header>
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2d54] via-[#103e69] to-[#24c1c4] p-7 text-white shadow-[0_20px_50px_rgba(11,45,84,0.16)] sm:p-9"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" /><div className="relative"><p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white/75">My Health</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Hello, {firstName} 👋</h1><p className="mt-3 max-w-2xl text-base leading-7 text-white/85">Your important health information is organised for you. Just choose what you need.</p></div></section>

      <section className="overflow-hidden rounded-[32px] border-2 border-[#24c1c4]/25 bg-gradient-to-br from-[#effcfc] via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]"><div className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#24c1c4]/15 text-4xl" aria-hidden="true">🟢</div><h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">What do I do today?</h2><p className="mt-2 text-base font-medium leading-7 text-slate-600">Your medicines, clinic visits and care plan are here.</p></div><Link href="/today" aria-label="Open what to do today" className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><ArrowRight className="h-6 w-6" /></Link></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><LargeAction href="/medications" icon={<Pill className="h-6 w-6" />} label={`${medications.length} medicine${medications.length === 1 ? "" : "s"}`} /><LargeAction href="/appointments" icon={<CalendarDays className="h-6 w-6" />} label={`${appointments.length} clinic visit${appointments.length === 1 ? "" : "s"}`} /><LargeAction href="/care-plans" icon={<CheckCircle2 className="h-6 w-6" />} label={`${activeGoals} care goal${activeGoals === 1 ? "" : "s"}`} /></div>{attentionCount > 0 && <Link href="/today" className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-base font-bold text-amber-900 ring-1 ring-amber-200"><TriangleAlert className="h-6 w-6 shrink-0" /><span>{attentionCount} thing{attentionCount === 1 ? "" : "s"} may need your attention</span><ArrowRight className="ml-auto h-5 w-5" /></Link>}<div className="mt-7 border-t-2 border-[#24c1c4]/15 pt-5"><div className="flex flex-col gap-4 rounded-3xl bg-[#0b2d54] p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Watch className="h-8 w-8" /></div><div><p className="text-lg font-black">⌚ Link Watch</p><p className="mt-1 text-sm font-medium text-white/70">{watchConnected ? "Your watch is connected" : "Bluetooth health watch"}</p></div></div><div className="flex min-h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"><span className={`h-4 w-4 rounded-full ${watchConnected ? "bg-emerald-400" : "bg-slate-300"}`} aria-hidden="true" /><span className="text-base font-extrabold">{watchConnected ? "Connected" : "Not linked"}</span><span role="switch" aria-checked={watchConnected} aria-label={watchConnected ? "Watch connected" : "Watch not linked"} className={`relative ml-2 h-8 w-14 rounded-full p-1 ${watchConnected ? "bg-emerald-500" : "bg-white/20"}`}><span className={`block h-6 w-6 rounded-full bg-white shadow ${watchConnected ? "translate-x-6" : "translate-x-0"}`} /></span></div></div></div></div></section>

      <section className="overflow-hidden rounded-[32px] border-2 border-red-200 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]"><div className="p-6 sm:p-8"><Link href="/health-passport" className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><div className="flex items-start justify-between gap-4"><div><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-4xl" aria-hidden="true">🔴</div><h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">My Clinic Card</h2><p className="mt-2 text-base font-medium leading-7 text-slate-600">Show this information when you visit a nurse or doctor.</p></div><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200"><ArrowRight className="h-6 w-6" /></span></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><HeartPulse className="h-6 w-6 text-red-500" /> BLOOD PRESSURE</div><p className="mt-3 text-4xl font-black tracking-tight text-[#0b2d54] sm:text-5xl">{bpValue}</p></div><div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><Watch className="h-6 w-6 text-red-500" /> ❤️ WATCH HEART</div><p className="mt-3 text-4xl font-black tracking-tight text-[#0b2d54] sm:text-5xl">{heartValue}</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><CountPill icon={<ShieldCheck className="h-5 w-5" />} count={conditions.length} label="conditions" /><CountPill icon={<TriangleAlert className="h-5 w-5" />} count={allergies.length} label="allergies" /><CountPill icon={<CheckCircle2 className="h-5 w-5" />} count={immunizations.length} label="vaccines" /></div></Link><div className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Scale className="h-7 w-7 text-[#0b2d54]" /><span className="text-lg font-black text-[#0b2d54]">⚖️ BMI / Weight</span></div><span className="text-lg font-black text-[#0b2d54]">{bmi != null ? bmi.toFixed(1) : "—"}</span></div><div className="relative mt-5 h-12 overflow-hidden rounded-2xl" aria-label="BMI scale: orange low, green just right, red high"><div className="grid h-full grid-cols-3"><div className="bg-orange-400" /><div className="bg-emerald-500" /><div className="bg-red-500" /></div><div className="absolute -top-1 h-14 w-1.5 rounded-full bg-[#0b2d54] shadow-lg" style={{ left: `${bmiMarker}%` }} aria-hidden="true" /><div className="pointer-events-none absolute inset-0 grid grid-cols-3 items-center text-center text-sm font-black text-white"><span>LOW</span><span>JUST RIGHT</span><span>HIGH</span></div></div><div className="mt-3 flex justify-between text-sm font-bold text-slate-500"><span>{data.healthSnapshot?.weightKg != null ? `${data.healthSnapshot.weightKg} kg` : "Weight not added"}</span><span>{bmiCategory ? display(bmiCategory) : "Add weight + height"}</span></div></div></div></section>

      <section className="overflow-hidden rounded-[32px] border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]"><Link href="/health-journal" className="block p-6 sm:p-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><div className="flex items-start justify-between gap-4"><div><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-4xl" aria-hidden="true">🔵</div><h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">My History &amp; Papers</h2><p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-600">One simple folder for your health story and important papers.</p></div><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200"><ArrowRight className="h-6 w-6" /></span></div><div className="mt-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100"><div className="flex items-center gap-5"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-100 text-5xl" aria-hidden="true">📁</div><div><p className="text-2xl font-black text-[#0b2d54]">Open my health folder</p><p className="mt-1 text-base font-medium text-slate-500">Episodes · Visits · Lab results · Scans · Documents</p></div></div><div className="mt-6 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#0b2d54] px-5 py-3 text-base font-black text-white">Open folder <FolderOpen className="h-6 w-6" /></div></div></Link></section>
      <p className="pb-5 text-center text-sm font-medium text-slate-400">Sympto keeps your health information together so you have less to remember.</p>
    </div>
  </main></ProtectedRoute>;
}
