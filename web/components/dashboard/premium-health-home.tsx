"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, FolderOpen, HeartPulse, Pill, ShieldCheck, TriangleAlert, Watch, Weight } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

function display(value: unknown): string { return value === null || value === undefined || value === "" ? "—" : String(value); }
function calculateBmi(weightKg: number | null, heightCm: number | null): number | null { if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null; return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)); }
function bmiStatus(bmi: number | null) {
  if (bmi == null || Number.isNaN(bmi)) return { label: "Normal weight", text: "text-slate-500", bg: "bg-slate-100" };
  if (bmi < 18.5) return { label: "Underweight", text: "text-amber-700", bg: "bg-amber-50" };
  if (bmi <= 24.9) return { label: "Normal weight", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (bmi <= 29.9) return { label: "Obese", text: "text-orange-700", bg: "bg-orange-50" };
  return { label: "Extreme obese", text: "text-red-700", bg: "bg-red-50" };
}

function count(value: unknown): number { return Array.isArray(value) ? value.length : Number(value ?? 0) || 0; }

function WeightVitals({ data, reload }: { data: any; reload: () => Promise<void> }) {
  const [weight, setWeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const patient = data?.patient ?? {};
  const sourceWeight = Number(data?.weightKg ?? data?.weight ?? patient?.weightKg ?? 0) || 0;
  const height = Number(data?.heightCm ?? data?.height ?? patient?.heightCm ?? 0) || 0;
  const currentWeight = weight ?? sourceWeight;
  const bmi = calculateBmi(currentWeight || null, height || null);
  const status = bmiStatus(bmi);
  const save = async () => {
    if (!currentWeight || !height || saving) return;
    try { setSaving(true); await healthHomeService.updateWeight(currentWeight, height); await reload(); }
    finally { setSaving(false); }
  };
  const measurements = Array.isArray(data?.wearableMeasurements) ? data.wearableMeasurements : Array.isArray(data?.measurements) ? data.measurements : [];
  const heart = measurements.find((m: any) => ["HEART_RATE", "HEARTRATE", "HR"].includes(String(m?.type ?? m?.measurementType ?? "").toUpperCase()));
  const bp = measurements.find((m: any) => ["BLOOD_PRESSURE", "BLOODPRESSURE", "BP"].includes(String(m?.type ?? m?.measurementType ?? "").toUpperCase()));
  const watchConnected = count(data?.wearableDevices ?? data?.wearables) > 0;
  return <div className="mt-5 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b2d54]/8"><HeartPulse className="h-6 w-6 text-[#0b2d54]" /></div><div><h3 className="text-lg font-black text-[#0b2d54]">Vitals &amp; Connected Health</h3><p className="text-xs font-semibold text-slate-500">Your measurements and connected devices</p></div></div><Watch className={`h-6 w-6 ${watchConnected ? "text-[#24c1c4]" : "text-slate-300"}`} /></div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Heart rate</p><p className="mt-2 text-xl font-black text-[#0b2d54]">{display(heart?.value ?? data?.heartRate ?? "—")} <span className="text-xs text-slate-400">bpm</span></p></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Blood pressure</p><p className="mt-2 text-xl font-black text-[#0b2d54]">{display(bp?.value ?? data?.bloodPressure ?? "—")}</p></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Weight</p><p className="mt-2 text-xl font-black text-[#0b2d54]">{currentWeight ? currentWeight.toFixed(1) : "—"} <span className="text-xs text-slate-400">kg</span></p></div>
      <div className={`rounded-2xl p-4 ${status.bg}`}><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">BMI</p><p className={`mt-2 text-xl font-black ${status.text}`}>{bmi != null ? bmi.toFixed(1) : "—"}</p><p className={`text-[10px] font-bold ${status.text}`}>{status.label}</p></div>
    </div>
    <div className="mt-4 rounded-2xl bg-[#0b2d54] p-4 text-white"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">Smart Watch</p><p className="mt-1 text-[11px] text-white/65">{watchConnected ? "Connected — wearable data can be used with your health context." : "Not connected — you can still record your vitals manually."}</p></div>{watchConnected ? <CheckCircle2 className="h-5 w-5 text-[#24c1c4]" /> : <Watch className="h-5 w-5 text-white/45" />}</div><div className="mt-3 flex flex-wrap gap-2"><Link href="/wearables" className="min-h-11 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#0b2d54]">{watchConnected ? "View watch" : "Connect Smart Watch"}</Link>{!watchConnected && <button type="button" onClick={() => void save()} disabled={!currentWeight || !height || saving} className="min-h-11 rounded-xl bg-[#24c1c4] px-4 py-2 text-xs font-black text-[#0b2d54] disabled:opacity-50">{saving ? "Saving…" : "Save vitals"}</button>}</div></div>
    <div className="mt-4"><label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Manual weight</label><div className="mt-2 flex gap-2"><input type="number" min="20" max="250" step="0.1" value={currentWeight || ""} onChange={(e) => setWeight(Number(e.target.value))} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#24c1c4]" placeholder="Weight in kg" /><button type="button" onClick={() => void save()} disabled={!currentWeight || !height || saving} className="min-h-11 rounded-xl bg-[#0b2d54] px-4 text-xs font-black text-white disabled:opacity-40">{saving ? "Saving…" : "Save"}</button></div></div>
  </div>;
}

export default function PremiumHealthHome() {
  const { data, loading, error, reload } = useDashboard();
  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-6xl animate-pulse space-y-4"><div className="h-72 rounded-[34px] bg-white" /><div className="h-64 rounded-[28px] bg-white" /><div className="h-64 rounded-[28px] bg-white" /><div className="h-64 rounded-[28px] bg-white" /></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-6"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 ring-1 ring-red-200"><TriangleAlert className="h-6 w-6 text-red-600" /><h1 className="mt-3 text-xl font-black text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-sm text-slate-500">Your health information has not been changed.</p><button onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 text-xs font-black text-white">Try again</button></div></main></ProtectedRoute>;
  const d: any = data;
  const medications = count(d.medications ?? d.activeMedications);
  const appointments = count(d.appointments ?? d.upcomingAppointments);
  const carePlans = count(d.carePlans);
  const conditions = count(d.conditions ?? d.patientDiagnoses ?? d.healthPassport?.conditions);
  const allergies = count(d.allergies ?? d.healthPassport?.allergies);
  const episodes = count(d.clinicalEpisodes ?? d.symptoms);
  const records = count(d.healthRecords ?? d.documents ?? d.encounters) + count(d.labResults) + count(d.imagingStudies);
  return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] px-4 pb-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <section className="relative mt-4 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] px-6 py-8 text-white shadow-[0_18px_52px_rgba(11,45,84,.10)] sm:px-9 sm:py-10"><div className="relative z-10 max-w-3xl"><p className="text-[11px] font-black uppercase tracking-[.21em] text-white/60">A calmer way to care for your health</p><h1 className="mt-4 text-4xl font-black tracking-[-.06em] sm:text-5xl">Good day, Bankies.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-[15px]">Sympto brings your next action, clinical context and health history together — so the right thing is easier to see.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/log-symptom" className="min-h-12 rounded-2xl bg-white px-5 py-3 text-xs font-black text-[#0b2d54]">✦ Log a symptom</Link><Link href="/today" className="min-h-12 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-xs font-black text-white">See what I need to do →</Link></div></div></section>
    <div className="my-7 flex items-end justify-between gap-4"><h2 className="text-xl font-black tracking-tight text-[#0b2d54]">Your health, at a glance</h2><span className="text-[11px] font-semibold text-slate-400">Connected health story</span></div>
    <section className="grid gap-4 lg:grid-cols-3">
      <Link href="/today" className="group min-h-[235px] rounded-[28px] bg-gradient-to-br from-white to-[#f2fcf8] p-6 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f8f1] text-[#168660]"><CheckCircle2 /></div><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Today</span></div><h3 className="mt-6 text-xl font-black text-[#0b2d54]">What do I do today?</h3><p className="mt-2 max-w-xs text-xs leading-6 text-slate-500">Medicines, visits, care goals and proactive next steps in one calm view.</p><div className="mt-6 flex items-center justify-between text-xs font-black text-[#0b2d54]"><span>{medications + appointments + carePlans} things to consider</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
      <Link href="/health-passport" className="group min-h-[235px] rounded-[28px] bg-gradient-to-br from-white to-[#fff5f4] p-6 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ef] text-[#c94d51]"><ShieldCheck /></div><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Care</span></div><h3 className="mt-6 text-xl font-black text-[#0b2d54]">My Clinic Card</h3><p className="mt-2 max-w-xs text-xs leading-6 text-slate-500">Your essential health context for appointments, care and secure clinical sharing.</p><div className="mt-6 flex items-center justify-between text-xs font-black text-[#0b2d54]"><span>{conditions} conditions · {allergies} allergies</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
      <Link href="/health-records" className="group min-h-[235px] rounded-[28px] bg-gradient-to-br from-white to-[#f2f7ff] p-6 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#3f75bd]"><FolderOpen /></div><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">History</span></div><h3 className="mt-6 text-xl font-black text-[#0b2d54]">My History &amp; Papers</h3><p className="mt-2 max-w-xs text-xs leading-6 text-slate-500">Symptoms, episodes, visits, results, scans and documents connected into one story.</p><div className="mt-6 flex items-center justify-between text-xs font-black text-[#0b2d54]"><span>{records + episodes} records &amp; episodes</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>
    </section>
    <WeightVitals data={d} reload={reload} />
    <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><article className="rounded-[28px] bg-white p-6 ring-1 ring-slate-200 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-[#0b2d54]">Your health story</h3><Link href="/health-records" className="text-[11px] font-black text-[#24c1c4]">View history →</Link></div><div className="mt-4 space-y-1"><div className="flex items-center gap-3 border-b border-slate-100 py-4"><CalendarDays className="h-5 w-5 text-[#0b2d54]" /><div><p className="text-xs font-black text-[#0b2d54]">Upcoming care</p><p className="mt-1 text-[11px] text-slate-500">{appointments} appointment{appointments === 1 ? "" : "s"} scheduled</p></div></div><div className="flex items-center gap-3 border-b border-slate-100 py-4"><HeartPulse className="h-5 w-5 text-[#24c1c4]" /><div><p className="text-xs font-black text-[#0b2d54]">Symptoms &amp; episodes</p><p className="mt-1 text-[11px] text-slate-500">{episodes} recorded episode{episodes === 1 ? "" : "s"}</p></div></div><div className="flex items-center gap-3 py-4"><Pill className="h-5 w-5 text-[#168660]" /><div><p className="text-xs font-black text-[#0b2d54]">Medicines</p><p className="mt-1 text-[11px] text-slate-500">{medications} active medication{medications === 1 ? "" : "s"}</p></div></div></div></article><article className="rounded-[28px] bg-[#0b2d54] p-6 text-white shadow-sm"><h3 className="text-lg font-black">Clinical context</h3><p className="mt-2 text-xs leading-6 text-white/65">The signals Sympto can use to make your next steps more relevant.</p><div className="mt-5 grid gap-2"><div className="flex justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs"><span className="text-white/65">Active medicines</span><b>{medications}</b></div><div className="flex justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs"><span className="text-white/65">Active conditions</span><b>{conditions}</b></div><div className="flex justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs"><span className="text-white/65">Recorded allergies</span><b>{allergies}</b></div><div className="flex justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs"><span className="text-white/65">Upcoming visits</span><b>{appointments}</b></div></div><div className="mt-5 flex items-center gap-2 text-[11px] font-bold text-white/65"><ShieldCheck className="h-4 w-4 text-[#24c1c4]" /> Your health data stays protected</div></article></section>
  </div></main></ProtectedRoute>;
}
