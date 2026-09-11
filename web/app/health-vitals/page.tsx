"use client";

import Link from "next/link";
import { Activity, ArrowLeft, HeartPulse, Thermometer, Wind } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

type Vital = {
  type: string;
  name: string;
  value: number | string;
  unit?: string | null;
  measuredAt?: string | null;
  source?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  UNDERWEIGHT: "Below healthy range",
  HEALTHY_WEIGHT: "Healthy weight range",
  OVERWEIGHT: "Above healthy range",
  OBESITY_CLASS_1: "Obesity class 1",
  OBESITY_CLASS_2: "Obesity class 2",
  OBESITY_CLASS_3: "Obesity class 3",
};

function number(value: unknown, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : String(value);
}

function date(value?: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function normalizeVitals(data: any): Vital[] {
  const all: Vital[] = [];

  for (const item of data?.healthSnapshot?.latestMeasurements ?? []) {
    if (item?.type == null || item?.value == null || !item?.measuredAt) continue;
    all.push({
      type: String(item.type).toUpperCase(),
      name: String(item.name ?? item.type).replaceAll("_", " "),
      value: item.value,
      unit: item.unit,
      measuredAt: item.measuredAt,
      source: item.source ?? "Connected device",
    });
  }

  for (const item of data?.clinicalVitals ?? []) {
    if (item?.value == null || !item?.measuredAt) continue;
    const type = String(item?.vitalType?.code ?? item?.type ?? item?.vitalType ?? "CLINICAL_VITAL").toUpperCase();
    all.push({
      type,
      name: String(item?.vitalType?.name ?? item?.name ?? type).replaceAll("_", " "),
      value: item.value,
      unit: item?.unit ?? item?.vitalType?.unit,
      measuredAt: item.measuredAt,
      source: item.source ?? "Clinical record",
    });
  }

  const latest = new Map<string, Vital>();
  for (const item of all) {
    const existing = latest.get(item.type);
    if (!existing || new Date(item.measuredAt ?? 0).getTime() > new Date(existing.measuredAt ?? 0).getTime()) {
      latest.set(item.type, item);
    }
  }

  return Array.from(latest.values()).sort((a, b) => new Date(b.measuredAt ?? 0).getTime() - new Date(a.measuredAt ?? 0).getTime());
}

function find(vitals: Vital[], types: string[]) {
  return vitals.find((v) => types.includes(v.type));
}

function formatVital(vital?: Vital, fallbackUnit?: string, digits = 0) {
  if (!vital) return "—";
  const value = typeof vital.value === "number" ? number(vital.value, digits) : String(vital.value);
  return `${value}${vital.unit || fallbackUnit ? ` ${vital.unit ?? fallbackUnit}` : ""}`;
}

function sourceLabel(value?: string | null) {
  return value || "Health record";
}

function VitalCard({ icon, label, vital, fallbackUnit, digits = 0 }: { icon: React.ReactNode; label: string; vital?: Vital; fallbackUnit?: string; digits?: number }) {
  return (
    <article className="rounded-[22px] border border-[#e3ecef] bg-white p-5 shadow-[0_8px_28px_rgba(11,45,84,0.04)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0b2d54]">{formatVital(vital, fallbackUnit, digits)}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Source</p>
        <p className="mt-1 text-xs font-semibold text-slate-600">{sourceLabel(vital?.source)}</p>
        <p className="mt-1 text-[11px] text-slate-400">{date(vital?.measuredAt)}</p>
      </div>
    </article>
  );
}

export default function HealthVitalsPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-5xl space-y-4"><div className="h-14 w-40 animate-pulse rounded-2xl bg-white"/><div className="h-44 animate-pulse rounded-[28px] bg-white"/><div className="h-72 animate-pulse rounded-[28px] bg-white"/></div></main></ProtectedRoute>;
  }

  if (error || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm"><h1 className="text-xl font-black text-[#0b2d54]">We couldn't load your measurements</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white">Try again</button></div></main></ProtectedRoute>;
  }

  const vitals = normalizeVitals(data);
  const bloodPressure = find(vitals, ["BLOOD_PRESSURE", "BLOODPRESSURE"]);
  const heartRate = find(vitals, ["HEART_RATE", "HEARTRATE"]);
  const oxygen = find(vitals, ["OXYGEN_SATURATION", "OXYGENSATURATION"]);
  const temperature = find(vitals, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]);
  const respiratory = find(vitals, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]);
  const bmi = data.healthSnapshot?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? null;

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb]"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>

    <section className="rounded-[30px] border border-[#dfeaed] bg-white p-6 shadow-[0_12px_38px_rgba(11,45,84,0.05)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">My health</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#0b2d54]">Measurements</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71839a]">Your latest available measurements from your health record and connected devices, shown together without creating new medical records.</p>
        </div>
        <Link href="/health-journal" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dfeaed] bg-[#f8fbfc] px-4 py-2 text-[11px] font-black text-[#0b2d54] hover:bg-[#eef8f9]">View health journey</Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <section className="rounded-[24px] bg-[#f8fbfc] p-5 ring-1 ring-[#e3ecef]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Body composition</p>
          <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#0b2d54]">{number(bmi, 1)}</p>
          <p className="text-xs font-bold text-[#71839a]">BMI</p>
          <p className="mt-3 inline-flex rounded-full bg-[#0b2d54]/[0.06] px-3 py-1.5 text-[10px] font-black text-[#0b2d54]">{bmiCategory ? CATEGORY_LABEL[bmiCategory] ?? bmiCategory.replaceAll("_", " ") : "Not available"}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Weight</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{number(data.healthSnapshot?.weightKg ?? data.patient?.weightKg, 1)} <span className="text-xs text-[#71839a]">kg</span></p></div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Height</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{number(data.healthSnapshot?.heightCm ?? data.patient?.heightCm)} <span className="text-xs text-[#71839a]">cm</span></p></div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <VitalCard icon={<HeartPulse className="h-5 w-5"/>} label="Blood pressure" vital={bloodPressure}/>
          <VitalCard icon={<Activity className="h-5 w-5"/>} label="Heart rate" vital={heartRate} fallbackUnit="bpm"/>
          <VitalCard icon={<Wind className="h-5 w-5"/>} label="Oxygen saturation" vital={oxygen} fallbackUnit="%" digits={1}/>
          <VitalCard icon={<Thermometer className="h-5 w-5"/>} label="Temperature" vital={temperature} fallbackUnit="°C" digits={1}/>
          <VitalCard icon={<Wind className="h-5 w-5"/>} label="Respiratory rate" vital={respiratory} fallbackUnit="/min"/>
        </section>
      </div>
    </section>

    <section className="mt-5 rounded-[28px] border border-[#dfeaed] bg-white p-5 shadow-[0_8px_28px_rgba(11,45,84,0.04)] sm:p-6">
      <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">How this works</p><h2 className="mt-1 text-lg font-black text-[#0b2d54]">One current view, connected to your record</h2></div><span className="rounded-full bg-[#24c1c4]/10 px-3 py-1.5 text-[10px] font-black text-[#0b2d54]">{vitals.length} latest measurements</span></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Measurements are selected from the existing Health Home data. When the same measurement type exists in multiple sources, the most recent recorded value is shown.</p>
    </section>
  </div></main></ProtectedRoute>;
}
