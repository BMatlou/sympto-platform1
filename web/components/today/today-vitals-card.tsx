"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, HeartPulse, Plus, Scale, Thermometer, Wind, X } from "lucide-react";
import { healthHomeService, type HealthHomeResponse } from "@/services/health-home.service";
import Link from "next/link";

type Props = {
  data: HealthHomeResponse;
  onUpdated?: () => void | Promise<void>;
};

type Vital = {
  type?: string;
  value?: number | string;
  unit?: string;
  measuredAt?: string;
};

function localDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sameLocalDay(value?: string) {
  if (!value) return false;
  return localDayKey(new Date(value)) === localDayKey();
}

function number(value: unknown, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : String(value);
}

function todayVitals(data: HealthHomeResponse) {
  const values: Vital[] = [];
  for (const item of data?.healthSnapshot?.latestMeasurements ?? []) {
    if (item?.type && item?.value != null && item?.measuredAt && sameLocalDay(item.measuredAt)) {
      values.push({ type: String(item.type).toUpperCase(), value: item.value, unit: item.unit, measuredAt: item.measuredAt });
    }
  }
  for (const item of data?.healthSnapshot?.normalizedVitals ?? data?.clinicalVitals ?? []) {
    const measuredAt = item?.measuredAt ? new Date(item.measuredAt).toISOString() : undefined;
    if (item?.value != null && measuredAt && sameLocalDay(measuredAt)) {
      values.push({
        type: String(item?.vitalType?.code ?? item?.type ?? item?.vitalType ?? "").toUpperCase(),
        value: item.value,
        unit: item?.unit ?? item?.vitalType?.unit,
        measuredAt,
      });
    }
  }
  const latest = new Map<string, Vital>();
  for (const item of values) {
    const previous = latest.get(String(item.type));
    if (!previous || new Date(String(item.measuredAt)).getTime() > new Date(String(previous.measuredAt)).getTime()) latest.set(String(item.type), item);
  }
  return latest;
}

function fieldValue(vitals: Map<string, Vital>, types: string[]) {
  for (const type of types) {
    const value = vitals.get(type)?.value;
    if (value != null) return String(value);
  }
  return "";
}

export default function TodayVitalsCard({ data, onUpdated }: Props) {
  const [dayKey, setDayKey] = useState(() => localDayKey());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    weightKg: "",
    heightCm: "",
    systolicPressure: "",
    diastolicPressure: "",
    restingHeartRate: "",
    oxygenSaturation: "",
    bodyTemperature: "",
    respiratoryRate: "",
  });

  const vitals = useMemo(() => todayVitals(data), [data]);
  const bmi = data.healthSnapshot?.bmi ?? data.patient?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? data.patient?.bmiCategory ?? null;
  const todayWeight = form.weightKg || fieldValue(vitals, ["WEIGHT", "BODY_WEIGHT"]);
  const todayHeight = form.heightCm || fieldValue(vitals, ["HEIGHT", "BODY_HEIGHT"]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextDay = localDayKey();
      if (nextDay !== dayKey) {
        setDayKey(nextDay);
        setOpen(false);
        setMessage("");
        setForm({ weightKg: "", heightCm: "", systolicPressure: "", diastolicPressure: "", restingHeartRate: "", oxygenSaturation: "", bodyTemperature: "", respiratoryRate: "" });
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [dayKey]);

  function openEntry() {
    setMessage("");
    setForm({
      weightKg: fieldValue(vitals, ["WEIGHT", "BODY_WEIGHT"]),
      heightCm: fieldValue(vitals, ["HEIGHT", "BODY_HEIGHT"]),
      systolicPressure: fieldValue(vitals, ["BLOOD_PRESSURE_SYSTOLIC", "SYSTOLIC_PRESSURE"]),
      diastolicPressure: fieldValue(vitals, ["BLOOD_PRESSURE_DIASTOLIC", "DIASTOLIC_PRESSURE"]),
      restingHeartRate: fieldValue(vitals, ["HEART_RATE", "HEARTRATE"]),
      oxygenSaturation: fieldValue(vitals, ["OXYGEN_SATURATION", "OXYGENSATURATION"]),
      bodyTemperature: fieldValue(vitals, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]),
      respiratoryRate: fieldValue(vitals, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]),
    });
    setOpen(true);
  }

  async function save() {
    setMessage("");
    const input: Record<string, number> = {};
    const keys = Object.keys(form) as Array<keyof typeof form>;
    for (const key of keys) {
      const value = Number(form[key]);
      if (form[key] !== "" && Number.isFinite(value)) input[key] = value;
    }
    if (Object.keys(input).length === 0) {
      setMessage("Enter at least one measurement for today.");
      return;
    }
    if ((input.systolicPressure != null) !== (input.diastolicPressure != null)) {
      setMessage("Enter both blood pressure values together.");
      return;
    }

    setBusy(true);
    try {
      const payload = { ...input, measuredAt: new Date().toISOString() };
      await healthHomeService.recordManualVitals(payload);
      if (input.weightKg != null && input.heightCm != null) {
        await healthHomeService.updateWeight(input.weightKg, input.heightCm);
      }
      setMessage("Today’s measurements saved.");
      setOpen(false);
      await onUpdated?.();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "We couldn’t save today’s measurements.");
    } finally {
      setBusy(false);
    }
  }

  const bloodPressure = vitals.get("BLOOD_PRESSURE");
  const heartRate = vitals.get("HEART_RATE") ?? vitals.get("HEARTRATE");
  const oxygen = vitals.get("OXYGEN_SATURATION") ?? vitals.get("OXYGENSATURATION");
  const temperature = vitals.get("BODY_TEMPERATURE") ?? vitals.get("BODYTEMPERATURE");
  const respiratory = vitals.get("RESPIRATORY_RATE") ?? vitals.get("RESPIRATORYRATE");
  const hasTodayMeasurements = vitals.size > 0 || Boolean(data.healthSnapshot?.bmi && todayWeight);

  return (
    <section className="mt-7 overflow-hidden rounded-[27px] border border-[#e0ebef] bg-white shadow-[0_6px_22px_rgba(11,45,84,0.035)]">
      <div className="flex flex-col gap-3 border-b border-[#edf2f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health picture</p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Vitals and essentials</h2>
            <span className="rounded-full bg-[#e5f7f6] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#0b6f73]">Today</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8795a0]">{hasTodayMeasurements ? "Today’s latest entries" : "Nothing recorded today yet"}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openEntry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white hover:bg-[#123e66]"><Plus className="h-3.5 w-3.5" />Add today’s measurements</button>
          <Link href="/health-vitals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2.5 text-[10px] font-black text-[#0b2d54]">History <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[235px_1fr]">
        <div className="rounded-[22px] bg-gradient-to-br from-[#f4fbfc] to-white p-4 ring-1 ring-[#e4eef1]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#71839a]">BMI</p><p className="mt-1 text-[38px] font-black leading-none tracking-[-.07em] text-[#0b2d54]">{number(bmi, 1)}</p><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-700">{bmiCategory ? String(bmiCategory).replaceAll("_", " ") : "Not available"}</span></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Activity className="h-4 w-4" /></span></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Weight" value={`${todayWeight ? number(todayWeight, 1) : "—"} kg`} /><Metric label="Height" value={`${todayHeight ? number(todayHeight, 0) : "—"} cm`} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <VitalTile icon={<HeartPulse className="h-3.5 w-3.5" />} label="Blood pressure" value={bloodPressure?.value != null ? `${bloodPressure.value} ${bloodPressure.unit ?? ""}`.trim() : "—"} />
          <VitalTile icon={<Activity className="h-3.5 w-3.5" />} label="Heart rate" value={heartRate?.value != null ? `${number(heartRate.value)} ${heartRate.unit ?? "bpm"}`.trim() : "—"} />
          <VitalTile icon={<Wind className="h-3.5 w-3.5" />} label="Oxygen" value={oxygen?.value != null ? `${number(oxygen.value, 1)} ${oxygen.unit ?? "%"}`.trim() : "—"} />
          <VitalTile icon={<Thermometer className="h-3.5 w-3.5" />} label="Temperature" value={temperature?.value != null ? `${number(temperature.value, 1)} ${temperature.unit ?? "°C"}`.trim() : "—"} />
          <VitalTile icon={<Wind className="h-3.5 w-3.5" />} label="Respiratory" value={respiratory?.value != null ? `${number(respiratory.value)} ${respiratory.unit ?? "/min"}`.trim() : "—"} />
        </div>
      </div>

      {message && <div className="border-t border-[#edf2f4] bg-[#f7fbfc] px-5 py-3 text-[11px] font-semibold text-[#0b2d54]">{message}</div>}

      {open && <div className="border-t border-[#edf2f4] bg-[#fbffff] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Today’s entry</p><h3 className="mt-1 text-lg font-black text-[#0b2d54]">Add your measurements</h3><p className="mt-1 text-[11px] text-[#8795a0]">These entry fields clear automatically when a new day starts.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Weight (kg)" value={form.weightKg} onChange={(value) => setForm((current) => ({ ...current, weightKg: value }))} />
          <Field label="Height (cm)" value={form.heightCm} onChange={(value) => setForm((current) => ({ ...current, heightCm: value }))} />
          <Field label="Systolic" value={form.systolicPressure} onChange={(value) => setForm((current) => ({ ...current, systolicPressure: value }))} />
          <Field label="Diastolic" value={form.diastolicPressure} onChange={(value) => setForm((current) => ({ ...current, diastolicPressure: value }))} />
          <Field label="Heart rate (bpm)" value={form.restingHeartRate} onChange={(value) => setForm((current) => ({ ...current, restingHeartRate: value }))} />
          <Field label="Oxygen (%)" value={form.oxygenSaturation} onChange={(value) => setForm((current) => ({ ...current, oxygenSaturation: value }))} />
          <Field label="Temperature (°C)" value={form.bodyTemperature} onChange={(value) => setForm((current) => ({ ...current, bodyTemperature: value }))} step="0.1" />
          <Field label="Respiratory (/min)" value={form.respiratoryRate} onChange={(value) => setForm((current) => ({ ...current, respiratoryRate: value }))} />
        </div>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-xl border border-[#d7e4e8] bg-white px-4 py-2 text-[10px] font-black text-[#74859a]">Cancel</button><button type="button" disabled={busy} onClick={() => void save()} className="min-h-10 rounded-xl bg-[#0b2d54] px-5 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save today’s measurements"}</button></div>
      </div>}

      <div className="border-t border-[#edf2f4] px-5 py-2.5 sm:px-6"><span className="text-[9px] font-medium text-[#9aa8b7]">BMI is a screening measure and should be considered with other health information. Saved measurements remain in your health history.</span></div>
    </section>
  );
}

function Field({ label, value, onChange, step = "0.1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return <label className="block"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#71839a]">{label}</span><input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 py-2.5 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e4eef1]"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9aa8b7]">{label}</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{value}</p></div>;
}

function VitalTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const recorded = value !== "—";
  return <div className="rounded-[18px] border border-[#e5edf0] bg-white px-3.5 py-3.5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span><p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[#71839a]">{label}</p></div><p className={`mt-2.5 text-lg font-black tracking-[-.03em] ${recorded ? "text-[#0b2d54]" : "text-[#a7b3bd]"}`}>{value}</p><p className="mt-1 text-[8px] font-semibold text-[#a7b3bd]">{recorded ? "Recorded today" : "Not recorded today"}</p></div>;
}
