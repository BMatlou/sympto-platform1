"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, HeartPulse, Plus, Thermometer, Wind, X } from "lucide-react";
import { healthHomeService } from "@/services/health-home.service";
import { healthJournalService } from "@/services/health-journal.service";

export type DashboardVital = {
  type?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  measuredAt?: string;
  source?: string | null;
};

type Props = {
  patientId?: string | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  measurements?: DashboardVital[];
};

type FormState = {
  weightKg: string;
  heightCm: string;
  systolicPressure: string;
  diastolicPressure: string;
  restingHeartRate: string;
  oxygenSaturation: string;
  bodyTemperature: string;
  respiratoryRate: string;
};

const EMPTY_FORM: FormState = {
  weightKg: "",
  heightCm: "",
  systolicPressure: "",
  diastolicPressure: "",
  restingHeartRate: "",
  oxygenSaturation: "",
  bodyTemperature: "",
  respiratoryRate: "",
};

const categoryLabel: Record<string, string> = {
  UNDERWEIGHT: "Below healthy range",
  HEALTHY_WEIGHT: "Healthy weight range",
  OVERWEIGHT: "Above healthy range",
  OBESITY_CLASS_1: "Obesity class 1",
  OBESITY_CLASS_2: "Obesity class 2",
  OBESITY_CLASS_3: "Obesity class 3",
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
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && localDayKey(date) === localDayKey();
}

function formatNumber(value: unknown, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : String(value);
}

function bmiCategoryFor(value: number | null) {
  if (value == null) return null;
  if (value < 18.5) return "UNDERWEIGHT";
  if (value < 25) return "HEALTHY_WEIGHT";
  if (value < 30) return "OVERWEIGHT";
  if (value < 35) return "OBESITY_CLASS_1";
  if (value < 40) return "OBESITY_CLASS_2";
  return "OBESITY_CLASS_3";
}

function tone(category?: string | null) {
  switch (category) {
    case "HEALTHY_WEIGHT": return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "UNDERWEIGHT": return "bg-amber-50 text-amber-700 ring-amber-100";
    case "OVERWEIGHT": return "bg-orange-50 text-orange-700 ring-orange-100";
    case "OBESITY_CLASS_1":
    case "OBESITY_CLASS_2":
    case "OBESITY_CLASS_3": return "bg-red-50 text-red-700 ring-red-100";
    default: return "bg-slate-50 text-slate-600 ring-slate-100";
  }
}

function findMeasurement(measurements: DashboardVital[], types: string[]) {
  return measurements.find((item) => types.includes(String(item.type ?? "").toUpperCase()));
}

function formFromMeasurements(measurements: DashboardVital[]): FormState {
  const value = (types: string[]) => findMeasurement(measurements, types)?.value;
  const bloodPressure = findMeasurement(measurements, ["BLOOD_PRESSURE"]);
  const bpParts = bloodPressure?.value != null ? String(bloodPressure.value).split("/") : [];

  return {
    weightKg: value(["WEIGHT", "BODY_WEIGHT"]) == null ? "" : String(value(["WEIGHT", "BODY_WEIGHT"])),
    heightCm: value(["HEIGHT", "BODY_HEIGHT"]) == null ? "" : String(value(["HEIGHT", "BODY_HEIGHT"])),
    systolicPressure: value(["BLOOD_PRESSURE_SYSTOLIC", "SYSTOLIC_PRESSURE"]) == null ? (bpParts[0] ?? "") : String(value(["BLOOD_PRESSURE_SYSTOLIC", "SYSTOLIC_PRESSURE"])),
    diastolicPressure: value(["BLOOD_PRESSURE_DIASTOLIC", "DIASTOLIC_PRESSURE"]) == null ? (bpParts[1] ?? "") : String(value(["BLOOD_PRESSURE_DIASTOLIC", "DIASTOLIC_PRESSURE"])),
    restingHeartRate: value(["HEART_RATE", "HEARTRATE"]) == null ? "" : String(value(["HEART_RATE", "HEARTRATE"])),
    oxygenSaturation: value(["OXYGEN_SATURATION", "OXYGENSATURATION"]) == null ? "" : String(value(["OXYGEN_SATURATION", "OXYGENSATURATION"])),
    bodyTemperature: value(["BODY_TEMPERATURE", "BODYTEMPERATURE"]) == null ? "" : String(value(["BODY_TEMPERATURE", "BODYTEMPERATURE"])),
    respiratoryRate: value(["RESPIRATORY_RATE", "RESPIRATORYRATE"]) == null ? "" : String(value(["RESPIRATORY_RATE", "RESPIRATORYRATE"])),
  };
}

function measurementsFromJournal(journal: any): DashboardVital[] {
  const recordedAt = String(journal?.updatedAt || journal?.createdAt || "");
  if (!sameLocalDay(recordedAt)) return [];
  const result: DashboardVital[] = [];
  const add = (type: string, value: unknown, unit: string) => {
    if (value === null || value === undefined || value === "") return;
    result.push({ type, value: Number(value), unit, measuredAt: recordedAt, source: "Health Journal" });
  };

  add("WEIGHT", journal.weightKg, "kg");
  const heightMatch = String(journal.notes ?? "").match(/Height:\s*([0-9.]+)\s*cm/i);
  if (heightMatch) add("HEIGHT", heightMatch[1], "cm");
  if (journal.bloodPressureSystolic != null && journal.bloodPressureDiastolic != null) {
    result.push({ type: "BLOOD_PRESSURE", value: `${journal.bloodPressureSystolic}/${journal.bloodPressureDiastolic}`, unit: "mmHg", measuredAt: recordedAt, source: "Health Journal" });
  }
  add("HEART_RATE", journal.heartRate, "bpm");
  add("OXYGEN_SATURATION", journal.oxygenSaturation, "%");
  add("BODY_TEMPERATURE", journal.temperature, "°C");
  add("RESPIRATORY_RATE", journal.respiratoryRate, "/min");
  return result;
}

function measurementsFromBaseline(baseline: any): DashboardVital[] {
  const recordedAt = String(baseline?.establishedAt || baseline?.updatedAt || "");
  if (!sameLocalDay(recordedAt)) return [];
  const result: DashboardVital[] = [];
  const add = (type: string, value: unknown, unit: string) => {
    if (value === null || value === undefined || value === "") return;
    result.push({ type, value: Number(value), unit, measuredAt: recordedAt, source: "Manual baseline" });
  };
  add("WEIGHT", baseline.weightKg, "kg");
  add("HEIGHT", baseline.heightCm, "cm");
  if (baseline.systolicPressure != null && baseline.diastolicPressure != null) {
    result.push({ type: "BLOOD_PRESSURE", value: `${baseline.systolicPressure}/${baseline.diastolicPressure}`, unit: "mmHg", measuredAt: recordedAt, source: "Manual baseline" });
  }
  add("HEART_RATE", baseline.restingHeartRate, "bpm");
  add("OXYGEN_SATURATION", baseline.oxygenSaturation, "%");
  add("BODY_TEMPERATURE", baseline.bodyTemperature, "°C");
  add("RESPIRATORY_RATE", baseline.respiratoryRate, "/min");
  return result;
}

function measurementsFromStorage(patientId?: string | null): DashboardVital[] {
  if (typeof window === "undefined" || !patientId) return [];
  try {
    const raw = window.localStorage.getItem(`sympto:today-measurements:${patientId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => sameLocalDay(item?.measuredAt)) : [];
  } catch {
    return [];
  }
}

function saveMeasurementsToStorage(patientId: string | null | undefined, measurements: DashboardVital[]) {
  if (typeof window === "undefined" || !patientId) return;
  try {
    window.localStorage.setItem(`sympto:today-measurements:${patientId}`, JSON.stringify(measurements));
  } catch {
    // Server persistence remains authoritative if browser storage is unavailable.
  }
}

function mergeMeasurements(current: DashboardVital[], incoming: DashboardVital[]) {
  const map = new Map<string, DashboardVital>();
  for (const item of [...current, ...incoming]) {
    const key = String(item.type ?? item.name ?? "").toUpperCase();
    if (!key || !sameLocalDay(item.measuredAt)) continue;
    const previous = map.get(key);
    if (!previous || new Date(String(item.measuredAt ?? 0)).getTime() >= new Date(String(previous.measuredAt ?? 0)).getTime()) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

export default function HealthVitalsSummary({ patientId, measurements = [] }: Props) {
  const [dayKey, setDayKey] = useState(() => localDayKey());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const initial = mergeMeasurements(measurements.filter((item) => sameLocalDay(item.measuredAt)), measurementsFromStorage(patientId));
  const [todayMeasurements, setTodayMeasurements] = useState<DashboardVital[]>(initial);
  const [form, setForm] = useState<FormState>(() => formFromMeasurements(initial));

  useEffect(() => {
    const incoming = mergeMeasurements(measurements.filter((item) => sameLocalDay(item.measuredAt)), measurementsFromStorage(patientId));
    setTodayMeasurements((current) => mergeMeasurements(current, incoming));
    if (incoming.length) setForm((current) => ({ ...current, ...formFromMeasurements(incoming) }));
  }, [measurements, patientId, dayKey]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const [journalResponse, healthHome] = await Promise.all([
          healthJournalService.getAll({ page: 1, limit: 100 }),
          healthHomeService.getHealthHome(),
        ]);
        if (!active) return;

        const journals = Array.isArray(journalResponse?.data) ? journalResponse.data : [];
        const todaysJournals = journals
          .filter((item: any) => sameLocalDay(String(item?.updatedAt || item?.createdAt || "")))
          .sort((a: any, b: any) => new Date(String(b.updatedAt || b.createdAt)).getTime() - new Date(String(a.updatedAt || a.createdAt)).getTime());

        const dedicatedJournal = todaysJournals.find((item: any) => item?.title === "[Sympto] Today's measurements");
        const fromJournal = dedicatedJournal ? measurementsFromJournal(dedicatedJournal) : [];
        const fromBaseline = measurementsFromBaseline(healthHome?.healthSnapshot?.baseline);
        const fromHealthHome = Array.isArray(healthHome?.healthSnapshot?.latestMeasurements)
          ? healthHome.healthSnapshot.latestMeasurements
              .filter((item: any) => sameLocalDay(String(item?.measuredAt || "")))
              .map((item: any) => ({ type: item.type ?? item.measurementType, name: item.name, value: item.value, unit: item.unit, measuredAt: item.measuredAt, source: item.source ?? "Health Home" }))
          : [];
        const fromStorage = measurementsFromStorage(patientId);

        const incoming = mergeMeasurements(
          mergeMeasurements(fromStorage, fromBaseline),
          mergeMeasurements(fromJournal, fromHealthHome),
        );
        if (!incoming.length) return;

        setTodayMeasurements((current) => mergeMeasurements(current, incoming));
        setForm((current) => ({ ...current, ...formFromMeasurements(incoming) }));
        saveMeasurementsToStorage(patientId, incoming);
      } catch {
        // The storage/server state already hydrated above remains usable when an API call is unavailable.
      }
    };

    void hydrate();
    return () => { active = false; };
  }, [dayKey, patientId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextDay = localDayKey();
      if (nextDay !== dayKey) {
        if (patientId) {
          try { window.localStorage.removeItem(`sympto:today-measurements:${patientId}`); } catch { /* ignore */ }
        }
        setDayKey(nextDay);
        setOpen(false);
        setMessage("");
        setTodayMeasurements([]);
        setForm({ ...EMPTY_FORM });
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [dayKey, patientId]);

  const todayWeight = Number(form.weightKg || findMeasurement(todayMeasurements, ["WEIGHT", "BODY_WEIGHT"])?.value || 0);
  const todayHeight = Number(form.heightCm || findMeasurement(todayMeasurements, ["HEIGHT", "BODY_HEIGHT"])?.value || 0);
  const todayBmi = todayWeight > 0 && todayHeight > 0 ? todayWeight / Math.pow(todayHeight / 100, 2) : null;
  const bmiCategory = bmiCategoryFor(todayBmi);
  const bloodPressure = findMeasurement(todayMeasurements, ["BLOOD_PRESSURE"]);
  const heartRate = findMeasurement(todayMeasurements, ["HEART_RATE", "HEARTRATE"]);
  const oxygen = findMeasurement(todayMeasurements, ["OXYGEN_SATURATION", "OXYGENSATURATION"]);
  const temperature = findMeasurement(todayMeasurements, ["BODY_TEMPERATURE", "BODYTEMPERATURE"]);
  const respiratory = findMeasurement(todayMeasurements, ["RESPIRATORY_RATE", "RESPIRATORYRATE"]);
  const bloodPressureLabel = useMemo(() => bloodPressure?.value == null ? "—" : `${bloodPressure.value}${bloodPressure.unit ? ` ${bloodPressure.unit}` : ""}`, [bloodPressure]);
  const hasTodayMeasurements = todayMeasurements.length > 0 || todayWeight > 0 || todayHeight > 0;

  function openEntry() {
    setMessage("");
    setForm(formFromMeasurements(todayMeasurements));
    setOpen(true);
  }

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveToday() {
    setMessage("");
    const input: Record<string, number> = {};
    for (const key of Object.keys(form) as Array<keyof FormState>) {
      if (form[key] === "") continue;
      const value = Number(form[key]);
      if (Number.isFinite(value)) input[key] = value;
    }
    if (Object.keys(input).length === 0) { setMessage("Enter at least one measurement for today."); return; }
    if ((input.systolicPressure != null) !== (input.diastolicPressure != null)) { setMessage("Enter both blood pressure values together."); return; }

    setBusy(true);
    try {
      const measuredAt = new Date().toISOString();
      await healthHomeService.recordManualVitals({ ...input, measuredAt });
      if (input.weightKg != null && input.heightCm != null) await healthHomeService.updateWeight(input.weightKg, input.heightCm);

      const nextMeasurements: DashboardVital[] = [];
      const add = (type: string, value: number | undefined, unit: string) => { if (value != null) nextMeasurements.push({ type, value, unit, measuredAt, source: "Today entry" }); };
      add("WEIGHT", input.weightKg, "kg");
      add("HEIGHT", input.heightCm, "cm");
      if (input.systolicPressure != null && input.diastolicPressure != null) nextMeasurements.push({ type: "BLOOD_PRESSURE", value: `${input.systolicPressure}/${input.diastolicPressure}`, unit: "mmHg", measuredAt, source: "Today entry" });
      add("HEART_RATE", input.restingHeartRate, "bpm");
      add("OXYGEN_SATURATION", input.oxygenSaturation, "%");
      add("BODY_TEMPERATURE", input.bodyTemperature, "°C");
      add("RESPIRATORY_RATE", input.respiratoryRate, "/min");

      setTodayMeasurements((current) => mergeMeasurements(current, nextMeasurements));
      setForm(formFromMeasurements(mergeMeasurements(todayMeasurements, nextMeasurements)));
      saveMeasurementsToStorage(patientId, nextMeasurements);
      window.dispatchEvent(new CustomEvent("sympto:weight-updated"));
      setMessage("Today’s measurements saved.");
      setOpen(false);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "We couldn’t save today’s measurements.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-7 overflow-hidden rounded-[27px] border border-[#e0ebef] bg-white shadow-[0_6px_22px_rgba(11,45,84,0.035)]">
    <div className="flex flex-col gap-3 border-b border-[#edf2f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div><div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health</span><span className="h-1 w-1 rounded-full bg-[#24c1c4]"/><span className="text-[10px] font-bold text-[#0b6f73]">Today</span></div><h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Vitals and essentials</h2><p className="mt-1 text-[11px] text-[#8795a0]">{hasTodayMeasurements ? "Today’s latest entries" : "Nothing recorded today yet"}</p></div>
      <div className="flex gap-2"><button type="button" onClick={openEntry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white hover:bg-[#123e66]"><Plus className="h-3.5 w-3.5"/>Add today’s measurements</button><Link href="/health-vitals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2.5 text-[10px] font-black text-[#0b2d54]">History <ArrowRight className="h-3 w-3"/></Link></div>
    </div>
    <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[245px_1fr]">
      <div className="rounded-[22px] bg-gradient-to-br from-[#f4fbfc] to-white p-4 ring-1 ring-[#e4eef1]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#71839a]">BMI</p><div className="mt-1 flex items-end gap-2"><p className="text-[38px] font-black leading-none tracking-[-.07em] text-[#0b2d54]">{formatNumber(todayBmi,1)}</p>{bmiCategory && <span className={`mb-1 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ring-1 ${tone(bmiCategory)}`}>{categoryLabel[bmiCategory] ?? String(bmiCategory).replaceAll("_"," ")}</span>}</div></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Activity className="h-4 w-4"/></span></div><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Weight" value={`${todayWeight > 0 ? formatNumber(todayWeight,1) : "—"} kg`}/><Metric label="Height" value={`${todayHeight > 0 ? formatNumber(todayHeight,0) : "—"} cm`}/></div></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><VitalTile icon={<HeartPulse className="h-3.5 w-3.5"/>} label="Blood pressure" value={bloodPressureLabel}/><VitalTile icon={<Activity className="h-3.5 w-3.5"/>} label="Heart rate" value={heartRate?.value != null ? `${formatNumber(heartRate.value)} ${heartRate.unit ?? "bpm"}`.trim() : "—"}/><VitalTile icon={<Wind className="h-3.5 w-3.5"/>} label="Oxygen" value={oxygen?.value != null ? `${formatNumber(oxygen.value,1)} ${oxygen.unit ?? "%"}`.trim() : "—"}/><VitalTile icon={<Thermometer className="h-3.5 w-3.5"/>} label="Temperature" value={temperature?.value != null ? `${formatNumber(temperature.value,1)} ${temperature.unit ?? "°C"}`.trim() : "—"}/><VitalTile icon={<Wind className="h-3.5 w-3.5"/>} label="Respiratory" value={respiratory?.value != null ? `${formatNumber(respiratory.value)} ${respiratory.unit ?? "/min"}`.trim() : "—"}/></div>
    </div>
    {message && <div className="border-t border-[#edf2f4] bg-[#f7fbfc] px-5 py-3 text-[11px] font-semibold text-[#0b2d54]">{message}</div>}
    {open && <div className="border-t border-[#edf2f4] bg-[#fbffff] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#71839a]">Today’s entry</p><h3 className="mt-1 text-lg font-black text-[#0b2d54]">Add your measurements</h3><p className="mt-1 text-[11px] text-[#8795a0]">These entry fields clear automatically when a new day starts.</p></div><button type="button" onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4"/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Weight (kg)" value={form.weightKg} onChange={(value)=>updateField("weightKg",value)}/><Field label="Height (cm)" value={form.heightCm} onChange={(value)=>updateField("heightCm",value)}/><Field label="Systolic" value={form.systolicPressure} onChange={(value)=>updateField("systolicPressure",value)}/><Field label="Diastolic" value={form.diastolicPressure} onChange={(value)=>updateField("diastolicPressure",value)}/><Field label="Heart rate (bpm)" value={form.restingHeartRate} onChange={(value)=>updateField("restingHeartRate",value)}/><Field label="Oxygen (%)" value={form.oxygenSaturation} onChange={(value)=>updateField("oxygenSaturation",value)}/><Field label="Temperature (°C)" value={form.bodyTemperature} onChange={(value)=>updateField("bodyTemperature",value)} step="0.1"/><Field label="Respiratory (/min)" value={form.respiratoryRate} onChange={(value)=>updateField("respiratoryRate",value)}/></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="min-h-10 rounded-xl border border-[#d7e4e8] bg-white px-4 py-2 text-[10px] font-black text-[#74859a]">Cancel</button><button type="button" disabled={busy} onClick={()=>void saveToday()} className="min-h-10 rounded-xl bg-[#0b2d54] px-5 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save today’s measurements"}</button></div></div>}
    <div className="border-t border-[#edf2f4] px-5 py-2.5 text-right sm:px-6"><span className="text-[9px] font-medium text-[#9aa8b7]">BMI is a screening measure and should be considered with other health information. Saved measurements remain in your health history.</span></div>
  </section>;
}

function Field({ label, value, onChange, step = "0.1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) { return <label className="block"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#71839a]">{label}</span><input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={(event)=>onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 py-2.5 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]"/></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e4eef1]"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#9aa8b7]">{label}</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{value}</p></div>; }
function VitalTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { const recorded = value !== "—"; return <div className="rounded-[18px] border border-[#e5edf0] bg-white px-3.5 py-3.5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#24c1c4]/10 text-[#0b2d54]">{icon}</span><p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-[#71839a]">{label}</p></div><p className={`mt-2.5 text-lg font-black tracking-[-.03em] ${recorded ? "text-[#0b2d54]" : "text-[#a7b3bd]"}`}>{value}</p><p className="mt-1 text-[8px] font-semibold text-[#a7b3bd]">{recorded ? "Recorded today" : "Not recorded today"}</p></div>; }
