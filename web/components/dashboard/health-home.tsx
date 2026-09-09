"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, FolderOpen, HeartPulse, Pill, ShieldCheck, TriangleAlert, Watch, Weight } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

function display(value: unknown): string { return value === null || value === undefined || value === "" ? "—" : String(value); }
function measurementValue(measurements: Array<Record<string, unknown>> | undefined, types: string[]) { return measurements?.find((item) => types.includes(String(item.type ?? item.measurementType ?? "").toUpperCase())); }
function formatDate(value: unknown): string { if (!value) return ""; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return ""; return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function bmi(weight: number | null, height: number | null): number | null { if (!weight || !height || weight <= 0 || height <= 0) return null; return Number((weight / Math.pow(height / 100, 2)).toFixed(1)); }
function bmiStatus(value: number | null) { if (value == null) return { label: "BMI not available", cls: "bg-slate-100 text-slate-600" }; if (value < 18.5) return { label: "Underweight", cls: "bg-amber-100 text-amber-800" }; if (value < 25) return { label: "Normal weight", cls: "bg-emerald-100 text-emerald-800" }; if (value < 30) return { label: "Overweight", cls: "bg-orange-100 text-orange-800" }; return { label: "Obese", cls: "bg-red-100 text-red-800" }; }

function LargeAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) { return <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">{icon}{label}</Link>; }
function CountPill({ icon, count, label }: { icon: ReactNode; count: number; label: string }) { return <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#24c1c4]/15 bg-white/90 px-4 py-2 text-[#0b2d54] shadow-sm">{icon}<span className="text-sm font-extrabold">{count}</span><span className="text-xs font-semibold text-slate-600">{label}</span></div>; }

function VaccinationDetails({ records }: { records: Array<Record<string, any>> }) {
  if (!records.length) return null;
  return <div className="mt-3 rounded-2xl bg-[#f5f8fb] p-4 ring-1 ring-[#24c1c4]/10">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#24c1c4]" /><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Vaccinations</p></div><span className="text-xs font-bold text-slate-400">Saved records</span></div>
    <div className="mt-3 space-y-2">
      {records.slice(0, 4).map((record, index) => <div key={record.id ?? `${record.name}-${index}`} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-3"><p className="min-w-0 text-sm font-extrabold text-[#0b2d54]">{record.name || "Vaccination"}</p>{record.doseNumber != null && <span className="shrink-0 text-[11px] font-bold text-slate-500">Dose {record.doseNumber}</span>}</div>
        {record.administeredAt && <p className="mt-1 text-xs font-medium text-slate-500">Given {formatDate(record.administeredAt)}</p>}
        {record.nextDueDate && <p className="mt-0.5 text-xs font-bold text-[#0b2d54]">Next due {formatDate(record.nextDueDate)}</p>}
      </div>)}
    </div>
    {records.length > 4 && <p className="mt-2 text-xs font-bold text-slate-500">+{records.length - 4} more vaccination{records.length - 4 === 1 ? "" : "s"}</p>}
  </div>;
}

function WeightBodySizeCard({ weightKg, heightCm, reload, patientId }: { weightKg: number | null | undefined; heightCm: number | null | undefined; reload: () => Promise<void>; patientId?: string }) {
  const canEdit = !patientId;
  const [value, setValue] = useState<number | null>(weightKg != null ? Number(weightKg) : null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentWeight = value ?? 60;
  const currentBmi = bmi(currentWeight, heightCm != null ? Number(heightCm) : null);
  const status = bmiStatus(currentBmi);
  const save = async () => { if (!canEdit || value == null || !heightCm || saving) return; try { setSaving(true); await healthHomeService.updateWeight(value, Number(heightCm)); await reload(); setEditing(false); } finally { setSaving(false); } };
  return <div className="mt-4 rounded-[24px] border border-[#24c1c4]/15 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24c1c4]/12 text-[#0b2d54]"><Weight className="h-6 w-6" /></div><div><h3 className="text-base font-extrabold text-[#0b2d54]">Weight &amp; Body Size</h3><p className="text-xs font-medium text-slate-500">Your current body weight</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${status.cls}`}>{status.label}</span></div>
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f5f8fb] p-4"><input aria-label="Weight in kilograms" type="number" min="1" max="250" step="0.1" disabled={!canEdit} value={currentWeight} onChange={(e) => { setValue(Number(e.target.value)); setEditing(true); }} className="w-32 bg-transparent text-3xl font-black text-[#0b2d54] outline-none disabled:opacity-100" /><span className="font-extrabold text-slate-400">kg</span><span className="text-xs font-extrabold uppercase text-slate-400">BMI</span><span className="font-black text-[#0b2d54]">{currentBmi ?? "—"}</span><span className="ml-auto text-xs font-bold text-slate-500">{canEdit ? "Edit weight" : "View only"}</span></div>
    {canEdit && editing && <button type="button" onClick={() => void save()} disabled={saving || !heightCm || value == null} className="mt-3 min-h-10 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Save weight"}</button>}
  </div>;
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-5xl space-y-4" aria-busy="true"><div className="h-32 animate-pulse rounded-[28px] bg-white" />{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-[28px] bg-white" />)}</div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6"><TriangleAlert className="h-6 w-6 text-red-600" /><h1 className="mt-4 text-xl font-extrabold text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-sm text-slate-500">Your health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 text-sm font-extrabold text-white">Try again</button></div></main></ProtectedRoute>;

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const activeGoals = (data.goals ?? []).filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length;
  const conditions = data.healthSnapshot?.activeConditions ?? [];
  const allergies = data.healthSnapshot?.allergies ?? [];
  // IMPORTANT: this is PatientImmunization data returned by Health Home.
  // Do not read the master Immunization catalogue or MedicalRecord notes here.
  const immunizations = Array.isArray(data.immunizations) ? data.immunizations : (data.healthSnapshot?.immunizations ?? []);
  const measurements = data.healthSnapshot?.latestMeasurements ?? [];
  const watchMeasurements = data.wearables?.latestMeasurements ?? [];
  const devices = data.wearables?.devices ?? [];
  const bloodPressure = measurementValue(measurements, ["BLOOD_PRESSURE", "BP"]);
  const heart = measurementValue(watchMeasurements as Array<Record<string, unknown>>, ["HEART_RATE", "HEART"]) ?? measurementValue(measurements, ["HEART_RATE", "HEART"]);
  const bpValue = bloodPressure ? `${display(bloodPressure.value)} ${display(bloodPressure.unit)}` : "—";
  const heartValue = heart ? `${display(heart.value)} ${display(heart.unit)}` : "—";
  const watchConnected = devices.length > 0;

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><header className="border-b border-[#24c1c4]/10 bg-white"><div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between px-4 sm:px-6"><img src="/logo-navbar.png" alt="Sympto" className="h-10 w-auto" /><span className="rounded-full bg-[#24c1c4]/10 px-3 py-1.5 text-xs font-extrabold text-[#0b2d54]">My Health</span></div></header>
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 sm:py-7">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-[0_16px_40px_rgba(11,45,84,0.14)] sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/75">My Health</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Hello, {firstName} 👋</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">Your important health information is organised for you. Just choose what you need.</p></section>
      <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-sm"><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12">🟢</div><h2 className="mt-4 text-2xl font-black text-[#0b2d54] sm:text-3xl">What do I do today?</h2><p className="mt-1 text-sm font-medium text-slate-600">Your medicines, clinic visits and care plan are here.</p></div><Link href="/today" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24c1c4]/10 text-[#0b2d54]"><ArrowRight className="h-5 w-5" /></Link></div><div className="mt-5 grid gap-2.5 sm:grid-cols-3"><LargeAction href="/medications" icon={<Pill className="h-5 w-5" />} label={`${medications.length} medicine${medications.length === 1 ? "" : "s"}`} /><LargeAction href="/appointments" icon={<CalendarDays className="h-5 w-5" />} label={`${appointments.length} clinic visit${appointments.length === 1 ? "" : "s"}`} /><LargeAction href="/health-goals" icon={<CheckCircle2 className="h-5 w-5" />} label={`${activeGoals} care goal${activeGoals === 1 ? "" : "s"}`} /></div><div className="mt-5 border-t border-[#24c1c4]/15 pt-4"><div className="flex items-center justify-between rounded-2xl bg-[#0b2d54] p-4 text-white"><div className="flex items-center gap-3"><Watch className="h-6 w-6" /><div><p className="text-base font-black">⌚ Link Watch</p><p className="text-xs text-white/70">{watchConnected ? "Your watch is connected" : "Bluetooth health watch"}</p></div></div><span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold">{watchConnected ? "Connected" : "Not linked"}</span></div></div></div></section>
      <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-sm"><div className="p-5 sm:p-6"><Link href="/health-passport" className="block"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12">🔴</div><h2 className="mt-4 text-2xl font-black text-[#0b2d54] sm:text-3xl">My Clinic Card</h2><p className="mt-1 text-sm font-medium text-slate-600">Show this information when you visit a nurse or doctor.</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24c1c4]/10"><ArrowRight className="h-5 w-5" /></span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f5f8fb] p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><HeartPulse className="h-5 w-5 text-[#24c1c4]" />BLOOD PRESSURE</div><p className="mt-2 text-3xl font-black text-[#0b2d54]">{bpValue}</p></div><div className="rounded-2xl bg-[#f5f8fb] p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Watch className="h-5 w-5 text-[#24c1c4]" />❤️ WATCH HEART</div><p className="mt-2 text-3xl font-black text-[#0b2d54]">{heartValue}</p></div></div><div className="mt-3 grid gap-2.5 sm:grid-cols-3"><CountPill icon={<ShieldCheck className="h-5 w-5 text-[#24c1c4]" />} count={conditions.length} label="conditions" /><CountPill icon={<TriangleAlert className="h-5 w-5 text-[#24c1c4]" />} count={allergies.length} label="allergies" /><CountPill icon={<CheckCircle2 className="h-5 w-5 text-[#24c1c4]" />} count={immunizations.length} label="vaccines" /></div><VaccinationDetails records={immunizations} /></Link><WeightBodySizeCard weightKg={data.healthSnapshot?.weightKg} heightCm={data.healthSnapshot?.heightCm} patientId={patientId} reload={reload} /></div></section>
      <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-sm"><Link href="/health-journal" className="block p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12">🔵</div><h2 className="mt-4 text-2xl font-black text-[#0b2d54] sm:text-3xl">My History &amp; Papers</h2><p className="mt-1 text-sm font-medium text-slate-600">One simple folder for your health story and important papers.</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24c1c4]/10"><ArrowRight className="h-5 w-5" /></span></div><div className="mt-5 rounded-2xl bg-[#f5f8fb] p-4"><div className="flex items-center gap-4"><FolderOpen className="h-7 w-7 text-[#24c1c4]" /><div><p className="text-base font-black text-[#0b2d54]">📁 Open my health folder</p><p className="mt-1 text-xs text-slate-500">Episodes · Encounters · Lab results · Imaging · Documents</p></div></div></div></Link></section>
    </div></main></ProtectedRoute>;
}
