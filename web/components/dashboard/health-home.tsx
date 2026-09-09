"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  HeartPulse,
  Pill,
  Weight,
  ShieldCheck,
  TriangleAlert,
  Watch,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function measurementValue(
  measurements: Array<Record<string, unknown>> | undefined,
  types: string[],
) {
  return measurements?.find((item) =>
    types.includes(String(item.type ?? item.measurementType ?? "").toUpperCase()),
  );
}

function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

function getWeightStatus(bmi?: number | null): {
  text: "(Underweight)" | "(Normal weight)" | "(Overweight)" | "(Obese)" | "(Extreme obese)";
  textClass: string;
  badgeClass: string;
  activeClass: string;
  markerClass: string;
} {
  if (bmi == null || Number.isNaN(bmi)) {
    return { text: "(Normal weight)", textClass: "text-slate-500", badgeClass: "bg-slate-100 text-slate-600", activeClass: "ring-slate-300", markerClass: "bg-slate-500" };
  }
  if (bmi < 16) {
    return { text: "(Underweight)", textClass: "text-amber-700", badgeClass: "bg-amber-100 text-amber-800", activeClass: "ring-amber-300", markerClass: "bg-amber-500" };
  }
  if (bmi < 18.5) {
    return { text: "(Underweight)", textClass: "text-yellow-700", badgeClass: "bg-yellow-100 text-yellow-800", activeClass: "ring-yellow-300", markerClass: "bg-yellow-500" };
  }
  if (bmi <= 24.9) {
    return { text: "(Normal weight)", textClass: "text-emerald-700", badgeClass: "bg-emerald-100 text-emerald-800", activeClass: "ring-emerald-300", markerClass: "bg-emerald-500" };
  }
  if (bmi <= 29.9) {
    return { text: "(Overweight)", textClass: "text-orange-700", badgeClass: "bg-orange-100 text-orange-800", activeClass: "ring-orange-300", markerClass: "bg-orange-500" };
  }
  if (bmi <= 39.9) {
    return { text: "(Obese)", textClass: "text-red-700", badgeClass: "bg-red-100 text-red-800", activeClass: "ring-red-300", markerClass: "bg-red-500" };
  }
  return { text: "(Extreme obese)", textClass: "text-red-800", badgeClass: "bg-red-100 text-red-900", activeClass: "ring-red-400", markerClass: "bg-red-700" };
}

function LargeAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
      {icon}{label}
    </Link>
  );
}

function CountPill({ icon, count, label }: { icon: ReactNode; count: number; label: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#24c1c4]/15 bg-white/90 px-4 py-2 text-[#0b2d54] shadow-sm">
      {icon}<span className="text-sm font-extrabold">{count}</span><span className="text-xs font-semibold text-slate-600">{label}</span>
    </div>
  );
}

function WeightBodySizeCard({ weightKg, heightCm, bmi, patientId, reload }: { weightKg: number | null | undefined; heightCm: number | null | undefined; bmi: number | null | undefined; patientId?: string; reload: () => Promise<void>; }) {
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [editingWeightInput, setEditingWeightInput] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const canEdit = !patientId;
  const minWeight = 1;
  const maxWeight = 250;
  const currentWeight = editingWeight ?? (weightKg != null ? Number(weightKg) : 60);
  const liveBmi = calculateBmi(currentWeight, heightCm != null ? Number(heightCm) : null) ?? (bmi != null ? Number(bmi) : null);
  const weightStatus = getWeightStatus(liveBmi);
  const sliderPercent = ((currentWeight - minWeight) / (maxWeight - minWeight)) * 100;

  const thresholdPercent = (bmiValue: number) => {
    if (!heightCm) return null;
    const thresholdWeight = bmiValue * Math.pow(Number(heightCm) / 100, 2);
    return Math.max(0, Math.min(100, ((thresholdWeight - minWeight) / (maxWeight - minWeight)) * 100));
  };
  const amberEnd = thresholdPercent(16);
  const yellowEnd = thresholdPercent(18.5);
  const greenEnd = thresholdPercent(24.9);
  const orangeEnd = thresholdPercent(29.9);
  const trackBackground = amberEnd != null && yellowEnd != null && greenEnd != null && orangeEnd != null
    ? `linear-gradient(to right, #f59e0b 0%, #f59e0b ${amberEnd}%, #eab308 ${amberEnd}%, #eab308 ${yellowEnd}%, #22c55e ${yellowEnd}%, #22c55e ${greenEnd}%, #f97316 ${greenEnd}%, #f97316 ${orangeEnd}%, #ef4444 ${orangeEnd}%, #ef4444 100%)`
    : "linear-gradient(to right, #f59e0b 0%, #f59e0b 20%, #eab308 20%, #eab308 35%, #22c55e 35%, #22c55e 55%, #f97316 55%, #f97316 70%, #ef4444 70%, #ef4444 100%)";

  const persistWeight = async () => {
    if (!canEdit || editingWeight == null || saveState === "saving") return;
    if (!heightCm) { setSaveState("error"); return; }
    try {
      setSaveState("saving");
      await healthHomeService.updateWeight(editingWeight, Number(heightCm));
      setSaveState("saved");
      setEditingWeightInput(false);
      await reload();
    } catch (error) {
      console.error("Failed to update weight:", error);
      setSaveState("error");
    }
  };

  const handleWeightChange = (value: string) => {
    const nextWeight = Number(value);
    if (!Number.isFinite(nextWeight)) return;
    const boundedWeight = Math.max(minWeight, Math.min(maxWeight, nextWeight));
    setEditingWeight(Number(boundedWeight.toFixed(1)));
    setSaveState("idle");
  };

  const handleWeightInputChange = (value: string) => {
    if (value.trim() === "") return;
    handleWeightChange(value);
  };

  const statusMessage = saveState === "saving" ? "Saving your weight…" : saveState === "saved" ? "Weight saved" : saveState === "error" ? "Could not save. Try again." : canEdit ? "Click your weight to type it, or move the slider" : "Family health information is view-only";

  return (
    <div className={`mt-4 rounded-[24px] border border-[#24c1c4]/15 bg-white p-4 shadow-sm ring-2 ${weightStatus.activeClass} sm:p-5`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#24c1c4]/12 text-[#0b2d54]" aria-hidden="true">
              <Weight className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#0b2d54]">Weight &amp; Body Size</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Your current body weight</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${weightStatus.badgeClass}`}>{weightStatus.text.replace(/[()]/g, "")}</span>
        </div>

        {editingWeightInput ? (
          <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3.5 ring-1 ring-[#24c1c4]/20">
            <label htmlFor="health-home-weight" className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Enter your weight</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="health-home-weight"
                type="number"
                inputMode="decimal"
                min={minWeight}
                max={maxWeight}
                step="0.1"
                value={currentWeight}
                onChange={(event) => handleWeightInputChange(event.target.value)}
                onBlur={() => setEditingWeightInput(false)}
                autoFocus
                className="h-14 w-full rounded-xl border-2 border-[#24c1c4] bg-white px-4 text-2xl font-black text-[#0b2d54] outline-none focus:ring-2 focus:ring-[#24c1c4]/30"
              />
              <span className="text-lg font-extrabold text-slate-400">kg</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Your BMI and slider update as you type.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setEditingWeightInput(true)}
            disabled={!canEdit || !heightCm}
            className="flex w-full items-end gap-3 rounded-2xl bg-[#f5f8fb] px-4 py-3.5 text-left ring-1 ring-[#24c1c4]/10 transition hover:ring-[#24c1c4]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] disabled:cursor-not-allowed"
            aria-label="Click to enter your weight"
          >
            <p className="text-3xl font-black leading-none tracking-tight text-[#0b2d54] sm:text-4xl">{currentWeight.toFixed(1)} <span className="text-lg font-extrabold text-slate-400">kg</span></p>
            <div className="pb-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">BMI</div>
            <div className={`pb-0.5 text-base font-black ${weightStatus.textClass}`}>{liveBmi != null ? liveBmi.toFixed(1) : "—"}<span className="ml-1 font-semibold">{weightStatus.text}</span></div>
            {canEdit && <span className="ml-auto pb-0.5 text-xs font-extrabold text-[#24c1c4]">Edit</span>}
          </button>
        )}

        <div className="relative pt-1">
          <div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500"><span>Low</span><span>Just right</span><span>High</span></div>
          <div className="relative h-12 overflow-visible rounded-xl">
            <div className="absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-xl shadow-inner" style={{ background: trackBackground }} aria-hidden="true" />
            <div className={`pointer-events-none absolute top-1/2 z-10 h-[52px] w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${weightStatus.markerClass} shadow-[0_3px_10px_rgba(11,45,84,0.3)] ring-3 ring-white transition-[left,background-color] duration-75`} style={{ left: `${Math.max(0, Math.min(100, sliderPercent))}%` }} aria-hidden="true">
              <span className={`absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${weightStatus.markerClass} ring-2 ring-white`} />
            </div>
            <input type="range" min={minWeight} max={maxWeight} step="0.1" value={currentWeight} disabled={!canEdit || !heightCm} onChange={(event) => handleWeightChange(event.target.value)} aria-label="Weight in kilograms" className="absolute inset-0 z-20 h-full w-full cursor-grab opacity-0 disabled:cursor-not-allowed" />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400"><span>{minWeight} kg</span><span>{maxWeight} kg</span></div>
        </div>

        <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl bg-[#0b2d54]/[0.04] px-3 py-2.5">
          <span className={`text-xs font-bold ${saveState === "error" ? "text-red-700" : saveState === "saved" ? "text-emerald-700" : "text-slate-500"}`}>{statusMessage}</span>
          {canEdit && <button type="button" onClick={() => void persistWeight()} disabled={editingWeight == null || saveState === "saving" || !heightCm} className="min-h-10 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#24c1c4] hover:text-[#0b2d54] disabled:cursor-not-allowed disabled:opacity-40">{saveState === "saving" ? "Saving…" : "Save weight"}</button>}
        </div>
      </div>
    </div>
  );
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-5xl space-y-4" aria-busy="true"><div className="h-32 animate-pulse rounded-[28px] bg-white" />{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-[28px] bg-white" />)}</div></main></ProtectedRoute>;
  }

  if (error || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><TriangleAlert className="h-6 w-6" /></div><h1 className="mt-4 text-xl font-extrabold text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#24c1c4] hover:text-[#0b2d54]">Try again</button></div></main></ProtectedRoute>;
  }

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
  const watchConnected = devices.length > 0;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <header className="border-b border-[#24c1c4]/10 bg-white"><div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between px-4 sm:px-6"><img src="/logo-navbar.png" alt="Sympto" className="h-10 w-auto" /><span className="rounded-full bg-[#24c1c4]/10 px-3 py-1.5 text-xs font-extrabold text-[#0b2d54]">My Health</span></div></header>
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 sm:py-7">
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-[0_16px_40px_rgba(11,45,84,0.14)] sm:p-7"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" /><div className="relative"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/75">My Health</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Hello, {firstName} 👋</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">Your important health information is organised for you. Just choose what you need.</p></div></section>
          <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-[0_12px_35px_rgba(11,45,84,0.07)]"><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12 text-[#0b2d54]" aria-hidden="true">🟢</div><h2 className="mt-4 text-2xl font-black tracking-tight text-[#0b2d54] sm:text-3xl">What do I do today?</h2><p className="mt-1 text-sm font-medium leading-6 text-slate-600">Your medicines, clinic visits and care plan are here.</p></div><Link href="/today" aria-label="Open what to do today" className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#24c1c4]/10 text-[#0b2d54] ring-1 ring-[#24c1c4]/20"><ArrowRight className="h-5 w-5" /></Link></div><div className="mt-5 grid gap-2.5 sm:grid-cols-3"><LargeAction href="/medications" icon={<Pill className="h-5 w-5" />} label={`${medications.length} medicine${medications.length === 1 ? "" : "s"}`} /><LargeAction href="/appointments" icon={<CalendarDays className="h-5 w-5" />} label={`${appointments.length} clinic visit${appointments.length === 1 ? "" : "s"}`} /><LargeAction href="/health-goals" icon={<CheckCircle2 className="h-5 w-5" />} label={`${activeGoals} care goal${activeGoals === 1 ? "" : "s"}`} /></div>{attentionCount > 0 && <Link href="/today" className="mt-3 flex min-h-11 items-center gap-3 rounded-2xl bg-[#24c1c4]/10 px-4 py-2.5 text-sm font-bold text-[#0b2d54] ring-1 ring-[#24c1c4]/20"><TriangleAlert className="h-5 w-5 shrink-0" /><span>{attentionCount} thing{attentionCount === 1 ? "" : "s"} may need your attention</span><ArrowRight className="ml-auto h-4 w-4" /></Link>}<div className="mt-5 border-t border-[#24c1c4]/15 pt-4"><div className="flex flex-col gap-3 rounded-2xl bg-[#0b2d54] p-4 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Watch className="h-6 w-6" /></div><div><p className="text-base font-black">⌚ Link Watch</p><p className="mt-0.5 text-xs font-medium text-white/70">{watchConnected ? "Your watch is connected" : "Bluetooth health watch"}</p></div></div><div className="flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3"><span className={`h-3.5 w-3.5 rounded-full ${watchConnected ? "bg-[#24c1c4]" : "bg-white/40"}`} /><span className="text-sm font-extrabold">{watchConnected ? "Connected" : "Not linked"}</span></div></div></div></div></section>
          <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-[0_12px_35px_rgba(11,45,84,0.07)]"><div className="p-5 sm:p-6"><Link href="/health-passport" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12 text-[#0b2d54]" aria-hidden="true">🔴</div><h2 className="mt-4 text-2xl font-black tracking-tight text-[#0b2d54] sm:text-3xl">My Clinic Card</h2><p className="mt-1 text-sm font-medium leading-6 text-slate-600">Show this information when you visit a nurse or doctor.</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#24c1c4]/10 text-[#0b2d54]"><ArrowRight className="h-5 w-5" /></span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f5f8fb] p-4 ring-1 ring-[#24c1c4]/10"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><HeartPulse className="h-5 w-5 text-[#24c1c4]" />BLOOD PRESSURE</div><p className="mt-2 text-3xl font-black tracking-tight text-[#0b2d54]">{bpValue}</p></div><div className="rounded-2xl bg-[#f5f8fb] p-4 ring-1 ring-[#24c1c4]/10"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Watch className="h-5 w-5 text-[#24c1c4]" />❤️ WATCH HEART</div><p className="mt-2 text-3xl font-black tracking-tight text-[#0b2d54]">{heartValue}</p></div></div><div className="mt-3 grid gap-2.5 sm:grid-cols-3"><CountPill icon={<ShieldCheck className="h-5 w-5 text-[#24c1c4]" />} count={conditions.length} label="conditions" /><CountPill icon={<TriangleAlert className="h-5 w-5 text-[#24c1c4]" />} count={allergies.length} label="allergies" /><CountPill icon={<CheckCircle2 className="h-5 w-5 text-[#24c1c4]" />} count={immunizations.length} label="vaccines" /></div></Link><WeightBodySizeCard weightKg={data.healthSnapshot?.weightKg} heightCm={data.healthSnapshot?.heightCm} bmi={data.healthSnapshot?.bmi} patientId={patientId} reload={reload} /></div></section>
          <section className="overflow-hidden rounded-[28px] border border-[#24c1c4]/25 bg-white shadow-[0_12px_35px_rgba(11,45,84,0.07)]"><Link href="/health-journal" className="block p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12 text-[#0b2d54]" aria-hidden="true">🔵</div><h2 className="mt-4 text-2xl font-black tracking-tight text-[#0b2d54] sm:text-3xl">My History &amp; Papers</h2><p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">One simple folder for your health story and important papers.</p></div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#24c1c4]/10 text-[#0b2d54]"><ArrowRight className="h-5 w-5" /></span></div><div className="mt-5 rounded-2xl bg-[#f5f8fb] p-4 ring-1 ring-[#24c1c4]/10"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#24c1c4]"><FolderOpen className="h-7 w-7" /></div><div><p className="text-base font-black text-[#0b2d54]">📁 Open my health folder</p><p className="mt-1 text-xs font-medium leading-5 text-slate-500">Episodes · Encounters · Lab results · Imaging · Documents</p></div></div></div></Link></section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
