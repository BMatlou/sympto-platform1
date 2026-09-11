"use client";

import Link from "next/link";
import { Activity, ArrowLeft, Bluetooth, Check, HeartPulse, Plus, Scale, Thermometer, Watch, Wind, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

type Vital = { type: string; name: string; value: number | string; unit?: string | null; measuredAt?: string | null; source?: string | null };

const CATEGORY_LABEL: Record<string, string> = { UNDERWEIGHT: "Below healthy range", HEALTHY_WEIGHT: "Healthy weight range", OVERWEIGHT: "Above healthy range", OBESITY_CLASS_1: "Obesity class 1", OBESITY_CLASS_2: "Obesity class 2", OBESITY_CLASS_3: "Obesity class 3" };

function number(value: unknown, digits = 0) { if (value === null || value === undefined || value === "") return "—"; const n = Number(value); return Number.isFinite(n) ? n.toFixed(digits) : String(value); }
function date(value?: string | null) { if (!value) return "Not recorded"; const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return "Not recorded"; return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(parsed); }

function normalizeVitals(data: any): Vital[] {
  const all: Vital[] = [];
  for (const item of data?.healthSnapshot?.latestMeasurements ?? []) {
    if (item?.type == null || item?.value == null || !item?.measuredAt) continue;
    all.push({ type: String(item.type).toUpperCase(), name: String(item.name ?? item.type).replaceAll("_", " "), value: item.value, unit: item.unit, measuredAt: item.measuredAt, source: item.source ?? "Health record" });
  }
  for (const item of data?.healthSnapshot?.normalizedVitals ?? data?.clinicalVitals ?? []) {
    if (item?.value == null || !item?.measuredAt) continue;
    const type = String(item?.vitalType?.code ?? item?.type ?? item?.vitalType ?? "CLINICAL_VITAL").toUpperCase();
    all.push({ type, name: String(item?.vitalType?.name ?? item?.name ?? type).replaceAll("_", " "), value: item.value, unit: item?.unit ?? item?.vitalType?.unit, measuredAt: typeof item.measuredAt === "string" ? item.measuredAt : new Date(item.measuredAt).toISOString(), source: item.source ?? "Clinical record" });
  }
  const latest = new Map<string, Vital>();
  for (const item of all) { const existing = latest.get(item.type); if (!existing || new Date(item.measuredAt ?? 0).getTime() > new Date(existing.measuredAt ?? 0).getTime()) latest.set(item.type, item); }
  return Array.from(latest.values()).sort((a, b) => new Date(b.measuredAt ?? 0).getTime() - new Date(a.measuredAt ?? 0).getTime());
}
function find(vitals: Vital[], types: string[]) { return vitals.find((v) => types.includes(v.type)); }
function formatVital(vital?: Vital, fallbackUnit?: string, digits = 0) { if (!vital) return "—"; const value = typeof vital.value === "number" ? number(vital.value, digits) : String(vital.value); return `${value}${vital.unit || fallbackUnit ? ` ${vital.unit ?? fallbackUnit}` : ""}`; }

function VitalCard({ icon, label, vital, fallbackUnit, digits = 0 }: { icon: React.ReactNode; label: string; vital?: Vital; fallbackUnit?: string; digits?: number }) {
  return <article className="rounded-[22px] border border-[#e3ecef] bg-white p-5 shadow-[0_8px_28px_rgba(11,45,84,0.04)]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">{label}</p><p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0b2d54]">{formatVital(vital, fallbackUnit, digits)}</p></div></div><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Source</p><p className="mt-1 text-xs font-semibold text-slate-600">{vital?.source || "Not recorded"}</p><p className="mt-1 text-[11px] text-slate-400">{date(vital?.measuredAt)}</p></div></article>;
}

function Field({ label, name, value, onChange, placeholder, step = "1" }: { label: string; name: string; value: string; onChange: (value: string) => void; placeholder: string; step?: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#71839a]">{label}</span><input name={name} type="number" inputMode="decimal" step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-[#0b2d54] outline-none ring-0 placeholder:text-slate-300 focus:border-[#24c1c4]" /></label>;
}

export default function HealthVitalsPage() {
  const { data, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const viewingFamilyMember = Boolean(searchParams.get("patientId"));
  const [panel, setPanel] = useState<"bmi" | "manual" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiHeight, setBmiHeight] = useState("");
  const [manual, setManual] = useState({ systolicPressure: "", diastolicPressure: "", restingHeartRate: "", oxygenSaturation: "", bodyTemperature: "", respiratoryRate: "", weightKg: "" });

  const vitals = useMemo(() => normalizeVitals(data), [data]);

  async function saveBmi(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const weight = Number(bmiWeight); const height = Number(bmiHeight);
    if (!weight || !height) { setMessage("Enter both your weight and height to calculate BMI."); return; }
    setBusy(true);
    try { const result = await healthHomeService.updateWeight(weight, height); setMessage(`BMI saved: ${result.bmi != null ? result.bmi.toFixed(1) : "not available"}.`); setPanel(null); await reload(); }
    catch (err: any) { setMessage(err?.response?.data?.message || "We couldn't save your BMI measurement."); }
    finally { setBusy(false); }
  }

  async function saveManualVitals(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const input: Record<string, number> = {};
    const mappings: Record<string, keyof typeof manual> = { systolicPressure: "systolicPressure", diastolicPressure: "diastolicPressure", restingHeartRate: "restingHeartRate", oxygenSaturation: "oxygenSaturation", bodyTemperature: "bodyTemperature", respiratoryRate: "respiratoryRate", weightKg: "weightKg" };
    for (const key of Object.keys(mappings)) { const value = Number(manual[mappings[key]]); if (manual[mappings[key]] !== "" && Number.isFinite(value)) input[key] = value; }
    if (Object.keys(input).length === 0) { setMessage("Enter at least one vital before saving."); return; }
    setBusy(true);
    try { await healthHomeService.recordManualVitals(input); setMessage("Your manual measurement was saved to your health record."); setPanel(null); await reload(); }
    catch (err: any) { setMessage(err?.response?.data?.message || "We couldn't save the manual vitals."); }
    finally { setBusy(false); }
  }

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-5xl space-y-4"><div className="h-14 w-40 animate-pulse rounded-2xl bg-white"/><div className="h-44 animate-pulse rounded-[28px] bg-white"/><div className="h-72 animate-pulse rounded-[28px] bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm"><h1 className="text-xl font-black text-[#0b2d54]">We couldn't load your measurements</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white">Try again</button></div></main></ProtectedRoute>;

  const bloodPressure = find(vitals, ["BLOOD_PRESSURE", "BLOODPRESSURE"]);
  const heartRate = find(vitals, ["HEART_RATE", "HEARTRATE"]);
  const oxygen = find(vitals, ["OXYGEN_SATURATION", "OXYGENSATURATION"]);
  const temperature = find(vitals, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]);
  const respiratory = find(vitals, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]);
  const bmi = data.healthSnapshot?.bmi ?? data.patient?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? data.patient?.bmiCategory ?? null;
  const connectedDevices = data.wearables?.devices ?? data.healthSnapshot?.connectedDevices ?? [];

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb]"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>

    <section className="rounded-[30px] border border-[#dfeaed] bg-white p-6 shadow-[0_12px_38px_rgba(11,45,84,0.05)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">My health</p><h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#0b2d54]">Measurements</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#71839a]">Measure your BMI, connect a compatible watch for live readings, or enter vital signs yourself.</p></div><Link href="/health-journal" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfeaed] bg-[#f8fbfc] px-4 py-2 text-[11px] font-black text-[#0b2d54] hover:bg-[#eef8f9]">View health journey</Link></div>

      {viewingFamilyMember ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">You are viewing another family member. Their measurements are shown here, but new measurements can only be recorded from that person’s own account.</div> : <section className="mt-6"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Take a measurement</p><div className="mt-3 grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => { setPanel("bmi"); setMessage(""); setBmiWeight(data.healthSnapshot?.weightKg != null ? String(data.healthSnapshot.weightKg) : data.patient?.weightKg != null ? String(data.patient.weightKg) : ""); setBmiHeight(data.healthSnapshot?.heightCm != null ? String(data.healthSnapshot.heightCm) : data.patient?.heightCm != null ? String(data.patient.heightCm) : ""); }} className="rounded-[22px] border border-[#dfeaed] bg-[#f8fbfc] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Scale className="h-5 w-5"/></span><p className="mt-4 text-base font-black text-[#0b2d54]">Measure my BMI</p><p className="mt-1 text-xs leading-5 text-[#71839a]">Enter your current weight and height. Sympto calculates your BMI and saves the measurement.</p></button>
        <Link href="/wearables" className="rounded-[22px] border border-[#dfeaed] bg-[#f8fbfc] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Watch className="h-5 w-5"/></span><p className="mt-4 text-base font-black text-[#0b2d54]">Connect my smart watch</p><p className="mt-1 text-xs leading-5 text-[#71839a]">Link a compatible Bluetooth heart-rate device and let Sympto bring readings into your record.</p></Link>
        <button type="button" onClick={() => { setPanel("manual"); setMessage(""); }} className="rounded-[22px] border border-[#dfeaed] bg-[#f8fbfc] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Plus className="h-5 w-5"/></span><p className="mt-4 text-base font-black text-[#0b2d54]">Enter vitals manually</p><p className="mt-1 text-xs leading-5 text-[#71839a]">Add blood pressure, heart rate, oxygen, temperature, breathing rate or weight from a home reading.</p></button>
      </div></section>}

      {message && <div className="mt-4 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-4 text-sm font-semibold text-[#0b2d54]">{message}</div>}

      {panel && !viewingFamilyMember && <section className="mt-5 rounded-[24px] border border-[#24c1c4]/25 bg-[#fbffff] p-5 ring-1 ring-[#24c1c4]/10 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">{panel === "bmi" ? "BMI measurement" : "Manual vital entry"}</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">{panel === "bmi" ? "Measure your BMI" : "Enter your latest readings"}</h2></div><button type="button" onClick={() => setPanel(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Close"><X className="h-4 w-4"/></button></div>
        {panel === "bmi" ? <form onSubmit={saveBmi} className="mt-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Current weight (kg)" name="weight" value={bmiWeight} onChange={setBmiWeight} placeholder="e.g. 72.5" step="0.1"/><Field label="Height (cm)" name="height" value={bmiHeight} onChange={setBmiHeight} placeholder="e.g. 175"/></div><p className="mt-4 text-xs leading-5 text-slate-500">BMI is calculated from the weight and height you enter. It is a screening measure and not a diagnosis.</p><button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Check className="h-4 w-4"/>{busy ? "Saving…" : "Calculate & save BMI"}</button></form> : <form onSubmit={saveManualVitals} className="mt-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Systolic BP (mmHg)" name="systolic" value={manual.systolicPressure} onChange={(value) => setManual((s) => ({ ...s, systolicPressure: value }))} placeholder="e.g. 120"/><Field label="Diastolic BP (mmHg)" name="diastolic" value={manual.diastolicPressure} onChange={(value) => setManual((s) => ({ ...s, diastolicPressure: value }))} placeholder="e.g. 80"/><Field label="Heart rate (bpm)" name="heart" value={manual.restingHeartRate} onChange={(value) => setManual((s) => ({ ...s, restingHeartRate: value }))} placeholder="e.g. 72"/><Field label="Oxygen saturation (%)" name="oxygen" value={manual.oxygenSaturation} onChange={(value) => setManual((s) => ({ ...s, oxygenSaturation: value }))} placeholder="e.g. 98" step="0.1"/><Field label="Temperature (°C)" name="temperature" value={manual.bodyTemperature} onChange={(value) => setManual((s) => ({ ...s, bodyTemperature: value }))} placeholder="e.g. 36.7" step="0.1"/><Field label="Respiratory rate (/min)" name="respiratory" value={manual.respiratoryRate} onChange={(value) => setManual((s) => ({ ...s, respiratoryRate: value }))} placeholder="e.g. 16"/><Field label="Weight (kg)" name="manualWeight" value={manual.weightKg} onChange={(value) => setManual((s) => ({ ...s, weightKg: value }))} placeholder="Optional" step="0.1"/></div><p className="mt-4 text-xs leading-5 text-slate-500">Enter only what you measured. Blank fields are left unchanged. Blood pressure requires both systolic and diastolic values.</p><button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Check className="h-4 w-4"/>{busy ? "Saving…" : "Save vitals"}</button></form>}
      </section>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_2fr]"><section className="rounded-[24px] bg-[#f8fbfc] p-5 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Body composition</p><p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#0b2d54]">{number(bmi, 1)}</p><p className="text-xs font-bold text-[#71839a]">BMI</p><p className="mt-3 inline-flex rounded-full bg-[#0b2d54]/[0.06] px-3 py-1.5 text-[10px] font-black text-[#0b2d54]">{bmiCategory ? CATEGORY_LABEL[bmiCategory] ?? bmiCategory.replaceAll("_", " ") : "Not available — measure your BMI above"}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Weight</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{number(data.healthSnapshot?.weightKg ?? data.patient?.weightKg, 1)} <span className="text-xs text-[#71839a]">kg</span></p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Height</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{number(data.healthSnapshot?.heightCm ?? data.patient?.heightCm)} <span className="text-xs text-[#71839a]">cm</span></p></div></div></section>
        <section className="grid gap-3 sm:grid-cols-2"><VitalCard icon={<HeartPulse className="h-5 w-5"/>} label="Blood pressure" vital={bloodPressure}/><VitalCard icon={<Activity className="h-5 w-5"/>} label="Heart rate" vital={heartRate} fallbackUnit="bpm"/><VitalCard icon={<Wind className="h-5 w-5"/>} label="Oxygen saturation" vital={oxygen} fallbackUnit="%" digits={1}/><VitalCard icon={<Thermometer className="h-5 w-5"/>} label="Temperature" vital={temperature} fallbackUnit="°C" digits={1}/><VitalCard icon={<Wind className="h-5 w-5"/>} label="Respiratory rate" vital={respiratory} fallbackUnit="/min"/></section></div>
    </section>

    <section className="mt-5 rounded-[28px] border border-[#dfeaed] bg-white p-5 shadow-[0_8px_28px_rgba(11,45,84,0.04)] sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Connected devices</p><h2 className="mt-1 text-lg font-black text-[#0b2d54]">Smartwatch & wearable readings</h2></div><Bluetooth className="h-5 w-5 text-[#24c1c4]"/></div>{connectedDevices.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5"><p className="text-sm font-bold text-[#0b2d54]">No watch connected yet.</p><p className="mt-1 text-xs leading-5 text-slate-500">Connect a compatible device to start bringing supported readings into Sympto.</p><Link href="/wearables" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[11px] font-black text-white"><Watch className="h-4 w-4"/>Connect a watch</Link></div> : <div className="mt-4 space-y-2">{connectedDevices.map((device: any) => <div key={device.id} className="flex items-center justify-between rounded-2xl bg-[#f8fbfc] p-4"><div><p className="text-sm font-bold text-[#0b2d54]">{device.manufacturer || "Wearable"} {device.model || "device"}</p><p className="mt-1 text-xs text-slate-500">{device.status || "CONNECTED"}{device.lastSyncAt ? ` · Last sync ${date(device.lastSyncAt)}` : ""}</p></div><Link href="/wearables" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">Manage</Link></div>)}</div>}</section>

    <section className="mt-5 rounded-[28px] border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><HeartPulse className="h-5 w-5 shrink-0 text-[#0b2d54]"/><div><p className="font-semibold text-[#0b2d54]">Keep your measurements current</p><p className="mt-1 text-sm leading-6 text-slate-600">Use BMI when your weight or height changes, connect a watch for supported live readings, and enter home measurements when you check your vital signs manually.</p></div></div></section>
  </div></main></ProtectedRoute>;
}
