"use client";

import Link from "next/link";
import { Activity, HeartPulse, Thermometer, Wind } from "lucide-react";

export type DashboardVital = {
  type?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  measuredAt?: string;
  source?: string | null;
};

type Props = {
  bmi?: number | null;
  bmiCategory?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  measurements?: DashboardVital[];
};

const categoryLabel: Record<string, string> = {
  UNDERWEIGHT: "Below healthy range",
  HEALTHY_WEIGHT: "Healthy weight range",
  OVERWEIGHT: "Above healthy range",
  OBESITY_CLASS_1: "Obesity class 1",
  OBESITY_CLASS_2: "Obesity class 2",
  OBESITY_CLASS_3: "Obesity class 3",
};

function formatNumber(value: unknown, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : String(value);
}

function measurement(measurements: DashboardVital[] | undefined, types: string[]) {
  return measurements?.find((item) => types.includes(String(item.type ?? "").toUpperCase()));
}

function bmiTone(category?: string | null) {
  switch (category) {
    case "HEALTHY_WEIGHT":
      return "text-emerald-700 bg-emerald-50 ring-emerald-100";
    case "UNDERWEIGHT":
      return "text-amber-700 bg-amber-50 ring-amber-100";
    case "OVERWEIGHT":
      return "text-orange-700 bg-orange-50 ring-orange-100";
    case "OBESITY_CLASS_1":
    case "OBESITY_CLASS_2":
    case "OBESITY_CLASS_3":
      return "text-red-700 bg-red-50 ring-red-100";
    default:
      return "text-slate-600 bg-slate-50 ring-slate-100";
  }
}

function vitalDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function HealthVitalsSummary({ bmi, bmiCategory, weightKg, heightCm, measurements = [] }: Props) {
  const bloodPressure = measurement(measurements, ["BLOOD_PRESSURE", "BLOODPRESSURE"]);
  const heartRate = measurement(measurements, ["HEART_RATE", "HEARTRATE"]);
  const oxygen = measurement(measurements, ["OXYGEN_SATURATION", "OXYGENSATURATION"]);
  const temperature = measurement(measurements, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]);
  const respiratory = measurement(measurements, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]);

  return (
    <section className="mt-7 rounded-[28px] border border-[#dfeaed] bg-white p-5 shadow-[0_8px_28px_rgba(11,45,84,0.04)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#0b2d54]">BMI &amp; vital signs</h2>
          <p className="mt-1 text-xs leading-5 text-[#71839a]">Your latest available measurements, brought together in one view.</p>
        </div>
        <Link href="/health-journal" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]">View health journey</Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[24px] border border-[#e3ecef] bg-[#f8fbfc] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Body composition</p>
              <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#0b2d54]">{formatNumber(bmi, 1)}</p>
              <p className="text-xs font-bold text-[#71839a]">BMI</p>
            </div>
            <div className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-wide ring-1 ${bmiTone(bmiCategory)}`}>
              {bmiCategory ? categoryLabel[bmiCategory] ?? bmiCategory.replaceAll("_", " ") : "Not available"}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Weight</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{formatNumber(weightKg, 1)} <span className="text-xs text-[#71839a]">kg</span></p></div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e3ecef]"><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Height</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{formatNumber(heightCm, 0)} <span className="text-xs text-[#71839a]">cm</span></p></div>
          </div>

          <p className="mt-4 text-[10px] leading-4 text-[#71839a]">BMI is a screening measure calculated from weight and height. It should be interpreted alongside your medical history and other health information.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <VitalTile icon={<HeartPulse className="h-4 w-4" />} label="Blood pressure" value={bloodPressure?.value != null ? `${bloodPressure.value} ${bloodPressure.unit ?? ""}`.trim() : "—"} recordedAt={vitalDate(bloodPressure?.measuredAt)} />
          <VitalTile icon={<Activity className="h-4 w-4" />} label="Heart rate" value={heartRate?.value != null ? `${formatNumber(heartRate.value)} ${heartRate.unit ?? "bpm"}`.trim() : "—"} recordedAt={vitalDate(heartRate?.measuredAt)} />
          <VitalTile icon={<Wind className="h-4 w-4" />} label="Oxygen saturation" value={oxygen?.value != null ? `${formatNumber(oxygen.value, 1)} ${oxygen.unit ?? "%"}`.trim() : "—"} recordedAt={vitalDate(oxygen?.measuredAt)} />
          <VitalTile icon={<Thermometer className="h-4 w-4" />} label="Temperature" value={temperature?.value != null ? `${formatNumber(temperature.value, 1)} ${temperature.unit ?? "°C"}`.trim() : "—"} recordedAt={vitalDate(temperature?.measuredAt)} />
          <VitalTile icon={<Wind className="h-4 w-4" />} label="Respiratory rate" value={respiratory?.value != null ? `${formatNumber(respiratory.value)} ${respiratory.unit ?? "/min"}`.trim() : "—"} recordedAt={vitalDate(respiratory?.measuredAt)} />
        </div>
      </div>
    </section>
  );
}

function VitalTile({ icon, label, value, recordedAt }: { icon: React.ReactNode; label: string; value: string; recordedAt: string }) {
  return (
    <div className="rounded-[20px] border border-[#e3ecef] bg-white p-4 ring-1 ring-transparent transition hover:ring-[#24c1c4]/20">
      <div className="flex items-center gap-2 text-[#0b2d54]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span><p className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">{label}</p></div>
      <p className="mt-3 text-xl font-black tracking-[-0.03em] text-[#0b2d54]">{value}</p>
      <p className="mt-1 text-[9px] font-semibold text-[#9aa8b7]">{recordedAt}</p>
    </div>
  );
}
