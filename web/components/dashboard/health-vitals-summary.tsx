"use client";

import Link from "next/link";
import { Activity, HeartPulse, Thermometer, Wind } from "lucide-react";

export type DashboardVital = { type?: string; name?: string; value?: number | string; unit?: string; measuredAt?: string; source?: string | null };
type Props = { bmi?: number | null; bmiCategory?: string | null; weightKg?: number | null; heightCm?: number | null; measurements?: DashboardVital[] };

const categoryLabel: Record<string, string> = { UNDERWEIGHT: "Below healthy range", HEALTHY_WEIGHT: "Healthy weight range", OVERWEIGHT: "Above healthy range", OBESITY_CLASS_1: "Obesity class 1", OBESITY_CLASS_2: "Obesity class 2", OBESITY_CLASS_3: "Obesity class 3" };
function formatNumber(value: unknown, digits = 0) { if (value === null || value === undefined || value === "") return "—"; const n = Number(value); return Number.isFinite(n) ? n.toFixed(digits) : String(value); }
function measurement(measurements: DashboardVital[] | undefined, types: string[]) { return measurements?.find((item) => types.includes(String(item.type ?? "").toUpperCase())); }
function tone(category?: string | null) { switch (category) { case "HEALTHY_WEIGHT": return "bg-emerald-50 text-emerald-700 ring-emerald-100"; case "UNDERWEIGHT": return "bg-amber-50 text-amber-700 ring-amber-100"; case "OVERWEIGHT": return "bg-orange-50 text-orange-700 ring-orange-100"; case "OBESITY_CLASS_1": case "OBESITY_CLASS_2": case "OBESITY_CLASS_3": return "bg-red-50 text-red-700 ring-red-100"; default: return "bg-slate-50 text-slate-600 ring-slate-100"; } }
function vitalDate(value?: string) { if (!value) return "Not recorded"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Not recorded"; return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date); }

export default function HealthVitalsSummary({ bmi, bmiCategory, weightKg, heightCm, measurements = [] }: Props) {
  const bloodPressure = measurement(measurements, ["BLOOD_PRESSURE", "BLOODPRESSURE"]);
  const heartRate = measurement(measurements, ["HEART_RATE", "HEARTRATE"]);
  const oxygen = measurement(measurements, ["OXYGEN_SATURATION", "OXYGENSATURATION"]);
  const temperature = measurement(measurements, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]);
  const respiratory = measurement(measurements, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]);
  return <section className="mt-7 overflow-hidden rounded-[26px] border border-[#dfeaed] bg-white shadow-[0_8px_28px_rgba(11,45,84,0.035)]">
    <div className="flex flex-col gap-3 border-b border-[#edf2f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div><div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health</span><span className="h-1 w-1 rounded-full bg-[#24c1c4]"/><span className="text-[10px] font-bold text-[#9aa8b7]">Latest measurements</span></div><h2 className="mt-1 text-lg font-black tracking-[-0.035em] text-[#0b2d54]">BMI &amp; vital signs</h2></div>
      <Link href="/health-vitals" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d9e7eb] bg-[#f8fbfc] px-3.5 py-2 text-[10px] font-black text-[#0b2d54] transition hover:border-[#24c1c4]/40">Open measurements <span aria-hidden>→</span></Link>
    </div>
    <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[245px_1fr]">
      <div className="rounded-[22px] bg-gradient-to-br from-[#f4fbfc] to-white p-4 ring-1 ring-[#e4eef1]">
        <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#71839a]">BMI</p><div className="mt-1 flex items-end gap-2"><p className="text-[38px] font-black leading-none tracking-[-0.07em] text-[#0b2d54]">{formatNumber(bmi,1)}</p><span className={`mb-1 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ring-1 ${tone(bmiCategory)}`}>{bmiCategory ? categoryLabel[bmiCategory] ?? bmiCategory.replaceAll("_"," ") : "Not available"}</span></div></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Activity className="h-4 w-4"/></span></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Weight" value={`${formatNumber(weightKg,1)} kg`}/><Metric label="Height" value={`${formatNumber(heightCm,0)} cm`}/></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <VitalTile icon={<HeartPulse className="h-3.5 w-3.5"/>} label="Blood pressure" value={bloodPressure?.value != null ? `${bloodPressure.value} ${bloodPressure.unit ?? ""}`.trim() : "—"} measuredAt={bloodPressure?.measuredAt}/>
        <VitalTile icon={<Activity className="h-3.5 w-3.5"/>} label="Heart rate" value={heartRate?.value != null ? `${formatNumber(heartRate.value)} ${heartRate.unit ?? "bpm"}`.trim() : "—"} measuredAt={heartRate?.measuredAt}/>
        <VitalTile icon={<Wind className="h-3.5 w-3.5"/>} label="Oxygen" value={oxygen?.value != null ? `${formatNumber(oxygen.value,1)} ${oxygen.unit ?? "%"}`.trim() : "—"} measuredAt={oxygen?.measuredAt}/>
        <VitalTile icon={<Thermometer className="h-3.5 w-3.5"/>} label="Temperature" value={temperature?.value != null ? `${formatNumber(temperature.value,1)} ${temperature.unit ?? "°C"}`.trim() : "—"} measuredAt={temperature?.measuredAt}/>
        <VitalTile icon={<Wind className="h-3.5 w-3.5"/>} label="Respiratory" value={respiratory?.value != null ? `${formatNumber(respiratory.value)} ${respiratory.unit ?? "/min"}`.trim() : "—"} measuredAt={respiratory?.measuredAt}/>
      </div>
    </div>
    <div className="border-t border-[#edf2f4] px-5 py-2.5 text-right sm:px-6"><span className="text-[9px] font-medium text-[#9aa8b7]">BMI is a screening measure and should be considered with other health information.</span></div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e4eef1]"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9aa8b7]">{label}</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{value}</p></div>; }
function VitalTile({ icon, label, value, measuredAt }: { icon: React.ReactNode; label: string; value: string; measuredAt?: string }) { const recorded = value !== "—"; return <div className="rounded-[18px] border border-[#e5edf0] bg-white px-3.5 py-3.5 transition hover:-translate-y-0.5 hover:border-[#24c1c4]/30 hover:shadow-[0_8px_18px_rgba(11,45,84,0.045)]"><div className="flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span><p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[#71839a]">{label}</p></div><p className={`mt-2.5 text-lg font-black tracking-[-0.03em] ${recorded ? "text-[#0b2d54]" : "text-[#a7b3bd]"}`}>{value}</p><p className="mt-1 truncate text-[8px] font-semibold text-[#a7b3bd]">{recorded ? vitalDate(measuredAt) : "Not recorded"}</p></div>; }
