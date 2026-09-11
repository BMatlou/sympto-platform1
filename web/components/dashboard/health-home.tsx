"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, FolderOpen, HeartPulse, ShieldCheck, TriangleAlert, Weight } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

function display(value: unknown): string { return value === null || value === undefined || value === "" ? "—" : String(value); }
function measurementValue(measurements: Array<Record<string, unknown>> | undefined, types: string[]) { return measurements?.find((item) => types.includes(String(item.type ?? item.measurementType ?? "").toUpperCase())); }
function calculateBmi(weightKg: number | null, heightCm: number | null): number | null { if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null; return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)); }
function getWeightStatus(bmi?: number | null): { text: "(Underweight)" | "(Normal weight)" | "(Obese)" | "(Extreme obese)"; textClass: string; badgeClass: string; activeClass: string; } {
  if (bmi == null || Number.isNaN(bmi)) return { text: "(Normal weight)", textClass: "text-slate-500", badgeClass: "bg-slate-100 text-slate-600", activeClass: "ring-slate-300" };
  if (bmi < 18.5) return { text: "(Underweight)", textClass: "text-amber-700", badgeClass: "bg-amber-100 text-amber-800", activeClass: "ring-amber-400" };
  if (bmi <= 24.9) return { text: "(Normal weight)", textClass: "text-emerald-700", badgeClass: "bg-emerald-100 text-emerald-800", activeClass: "ring-emerald-400" };
  if (bmi <= 29.9) return { text: "(Obese)", textClass: "text-orange-700", badgeClass: "bg-orange-100 text-orange-800", activeClass: "ring-orange-400" };
  return { text: "(Extreme obese)", textClass: "text-red-700", badgeClass: "bg-red-100 text-red-800", activeClass: "ring-red-400" };
}

function WeightBodySizeCard({ weightKg, heightCm, bmi, patientId, reload }: { weightKg: number | null | undefined; heightCm: number | null | undefined; bmi: number | null | undefined; patientId?: string; reload: () => Promise<void> }) {
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState("");
  const [inputOpen, setInputOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const canEdit = !patientId;
  const minWeight = 20;
  const maxWeight = 250;
  const currentWeight = editingWeight ?? (weightKg != null ? Number(weightKg) : 60);
  const liveBmi = calculateBmi(currentWeight, heightCm != null ? Number(heightCm) : null) ?? (bmi != null ? Number(bmi) : null);
  const weightStatus = getWeightStatus(liveBmi);
  const sliderPercent = ((currentWeight - minWeight) / (maxWeight - minWeight)) * 100;
  const thresholdPercent = (bmiValue: number) => { if (!heightCm) return null; const thresholdWeight = bmiValue * Math.pow(Number(heightCm) / 100, 2); return Math.max(0, Math.min(100, ((thresholdWeight - minWeight) / (maxWeight - minWeight)) * 100)); };
  const lowEnd = thresholdPercent(18.5);
  const normalEnd = thresholdPercent(24.9);
  const obeseEnd = thresholdPercent(29.9);
  const trackBackground = lowEnd != null && normalEnd != null && obeseEnd != null ? `linear-gradient(to right, #f59e0b 0%, #f59e0b ${lowEnd}%, #10b981 ${lowEnd}%, #10b981 ${normalEnd}%, #f97316 ${normalEnd}%, #f97316 ${obeseEnd}%, #ef4444 ${obeseEnd}%, #ef4444 100%)` : "linear-gradient(to right, #f59e0b 0%, #f59e0b 33%, #10b981 33%, #10b981 66%, #ef4444 66%, #ef4444 100%)";
  const persistWeight = async (weightOverride?: number) => {
    const nextWeight = weightOverride ?? editingWeight;
    if (!canEdit || nextWeight == null || saveState === "saving") return;
    if (!heightCm) { setSaveState("error"); return; }
    try { setSaveState("saving"); await healthHomeService.updateWeight(nextWeight, Number(heightCm)); setSaveState("saved"); setInputOpen(false); await reload(); }
    catch (error) { console.error("Failed to update weight:", error); setSaveState("error"); }
  };
  const handleWeightChange = (value: string) => { const nextWeight = Number(value); if (!Number.isFinite(nextWeight)) return; setEditingWeight(Number(nextWeight.toFixed(1))); setSaveState("idle"); };
  const handleManualWeightChange = (value: string) => {
    setManualWeight(value);
    const nextWeight = Number(value);
    if (!Number.isFinite(nextWeight) || nextWeight < minWeight || nextWeight > maxWeight) return;
    setEditingWeight(Number(nextWeight.toFixed(1)));
    setSaveState("idle");
  };
  const openInput = () => { if (!canEdit) return; setManualWeight(currentWeight.toString()); setInputOpen(true); setSaveState("idle"); };
  const statusMessage = saveState === "saving" ? "Saving your weight…" : saveState === "saved" ? "Weight saved" : saveState === "error" ? "Could not save. Try again." : canEdit ? "Move the slider or select BMI to enter your weight" : "Family health information is view-only";
  return <div className={`mt-5 rounded-[28px] bg-white p-5 shadow-sm ring-2 ${weightStatus.activeClass} sm:p-6`}>
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54]/8" aria-hidden="true"><Weight className="h-7 w-7 text-[#0b2d54]" /></div><div><h3 className="text-lg font-black text-[#0b2d54]">Weight &amp; Body Size</h3><p className="mt-1 text-xs font-bold text-slate-500">Your current body weight</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${weightStatus.badgeClass}`}>{weightStatus.text.replace(/[()]/g, "")}</span></div>
      <button type="button" onClick={openInput} disabled={!canEdit} className="w-full rounded-3xl bg-slate-50 px-4 py-4 text-left ring-1 ring-slate-100 transition hover:ring-[#24c1c4]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] disabled:cursor-default sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-3xl font-black leading-none tracking-tight text-[#0b2d54] sm:text-4xl">{currentWeight.toFixed(1)} <span className="text-xl font-extrabold text-slate-500">kg</span></p><p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Weight</p></div><div className="text-right"><p className="text-[11px] font-black text-slate-400">BMI</p><p className={`text-2xl font-black ${weightStatus.textClass}`}>{liveBmi != null ? liveBmi.toFixed(1) : "—"}</p><p className={`text-[11px] font-extrabold ${weightStatus.textClass}`}>{weightStatus.text}</p></div></div>
        {canEdit && <p className="mt-2.5 text-[11px] font-bold text-[#0b2d54]">Tap BMI to enter your weight</p>}
      </button>
      <div className="relative pt-2"><div className="mb-3 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500"><span>LOW</span><span>JUST RIGHT</span><span>HIGH</span></div><div className="relative h-14 overflow-visible rounded-2xl"><div className="absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 rounded-2xl shadow-inner" style={{ background: trackBackground }} aria-hidden="true" /><div className="pointer-events-none absolute top-1/2 z-10 h-[62px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b2d54] shadow-[0_4px_12px_rgba(11,45,84,0.35)] ring-4 ring-white transition-[left] duration-75" style={{ left: `${Math.max(0, Math.min(100, sliderPercent))}%` }} aria-hidden="true"><span className="absolute -top-3 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#0b2d54] ring-2 ring-white" /></div><input type="range" min={minWeight} max={maxWeight} step="0.1" value={currentWeight} disabled={!canEdit || !heightCm} onChange={(event) => handleWeightChange(event.target.value)} onPointerUp={() => void persistWeight()} onKeyUp={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") void persistWeight(); }} onBlur={() => void persistWeight()} aria-label="Weight in kilograms" className="absolute inset-0 z-20 h-full w-full cursor-grab opacity-0 disabled:cursor-not-allowed" /></div><div className="mt-3 flex justify-between text-[11px] font-bold text-slate-400"><span>{minWeight} kg</span><span>{maxWeight} kg</span></div></div>
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[#0b2d54]/5 px-4 py-3 text-xs font-bold"><span className={saveState === "error" ? "text-red-700" : saveState === "saved" ? "text-emerald-700" : "text-slate-600"}>{statusMessage}</span>{canEdit && <button type="button" onClick={() => void persistWeight()} disabled={editingWeight == null || saveState === "saving" || !heightCm} className="min-h-11 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-40">{saveState === "saving" ? "Saving…" : "Save weight"}</button>}</div>
    </div>
    {inputOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2d54]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="bmi-weight-dialog-title"><div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/12"><Weight className="h-6 w-6 text-[#0b2d54]" /></div><div><h4 id="bmi-weight-dialog-title" className="text-lg font-black text-[#0b2d54]">Update your weight</h4><p className="text-xs font-medium text-slate-500">Enter your weight in kilograms.</p></div></div><label className="mt-6 block text-xs font-extrabold text-[#0b2d54]">Weight (kg)<input type="number" inputMode="decimal" min={minWeight} max={maxWeight} step="0.1" value={manualWeight} onChange={(event) => handleManualWeightChange(event.target.value)} autoFocus className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-2xl font-black text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/20" placeholder="e.g. 60, 70 or 71" /></label><p className="mt-2 text-[11px] font-semibold text-slate-500">BMI: {liveBmi != null ? liveBmi.toFixed(1) : "—"} · {weightStatus.text}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setInputOpen(false)} className="min-h-11 rounded-xl px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">Cancel</button><button type="button" onClick={() => void persistWeight(Number(manualWeight))} disabled={!manualWeight || Number(manualWeight) < minWeight || Number(manualWeight) > maxWeight || !heightCm || saveState === "saving"} className="min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saveState === "saving" ? "Saving…" : "Save weight"}</button></div></div></div>}
  </div>;
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-[1300px] space-y-4" aria-busy="true"><div className="h-80 animate-pulse rounded-[34px] bg-white" /><div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-[27px] bg-white" />)}</div></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6"><TriangleAlert className="h-6 w-6 text-red-600" /><h1 className="mt-4 text-xl font-extrabold text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-sm text-slate-500">Your health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 text-sm font-extrabold text-white">Try again</button></div></main></ProtectedRoute>;

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 14 ? "Good day" : hour < 18 ? "Good afternoon" : "Good evening";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const activeGoals = (data.goals ?? []).filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length;
  const devices = data.wearables?.devices ?? [];
  const watchConnected = devices.length > 0;
  const todayActionCount = medications.length + appointments.length + activeGoals;
  const historyCount = (data.encounters?.length ?? 0) + (data.recentResults?.laboratory?.length ?? 0) + (data.recentResults?.imaging?.length ?? 0) + (data.attachments?.length ?? 0);

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#f4f9fb] text-[#14304d]">
      <div className="mx-auto max-w-[1300px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_18px_52px_rgba(11,45,84,0.10)] sm:p-9 lg:p-10">
          <div className="pointer-events-none absolute -right-[205px] -top-[255px] h-[500px] w-[500px] rounded-full border border-white/15 shadow-[0_0_0_34px_rgba(255,255,255,0.035),0_0_0_68px_rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute bottom-[-180px] left-[42%] h-[230px] w-[230px] rounded-full bg-[#24c1c4]/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_250px] lg:gap-9">
            <div>
              <p className="text-sm font-medium tracking-[-0.01em] text-white/85">{greeting}, {firstName}</p>
              <div className="mt-6 flex flex-wrap gap-2.5"><Link href="/log-symptom" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-white px-4 py-3 text-xs font-black text-[#0b2d54] shadow-sm transition hover:-translate-y-0.5"><HeartPulse className="h-4 w-4" />Log a symptom</Link><Link href="/today" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-white/25 bg-white/10 px-4 py-3 text-xs font-extrabold text-white backdrop-blur-sm transition hover:bg-white/15">Open today <ArrowRight className="h-4 w-4" /></Link></div>
            </div>
            <div className="mx-auto grid h-[190px] w-full max-w-[190px] place-items-center rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-md lg:ml-auto"><div className="grid h-[130px] w-[130px] place-items-center rounded-full border-[9px] border-[#24c1c4]/80 shadow-[0_0_34px_rgba(36,193,196,0.25)]"><div className="text-center"><b className="block text-[29px] font-black tracking-[-0.06em]">{todayActionCount}</b><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-white/70">today</span></div></div></div>
          </div>
        </section>

        <div className="my-7 px-1"><p className="text-[11px] font-black uppercase tracking-[0.21em] text-[#71839a]">Your health, at a glance</p><p className="mt-1 text-sm font-semibold text-[#71839a]">Choose what you need. Sympto will take you there.</p></div>

        <section className="grid gap-[15px] lg:grid-cols-3">
          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#f2fcf8] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#168660]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#e8f8f1] text-[#168660]"><CheckCircle2 className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Today</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">What do I do today?</h3><p className="mt-2 max-w-[280px] text-xs leading-5 text-[#71839a]">{todayActionCount > 0 ? `${todayActionCount} ${todayActionCount === 1 ? "thing needs" : "things need"} your attention.` : "Nothing urgent is waiting for you today."}</p><p className="mt-3 text-[11px] font-bold text-[#0b2d54]">Medication · Visit · Goal</p><Link href="/today" className="mt-6 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open today</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>

          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#fff5f4] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#c94d51]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#fff0ef] text-[#c94d51]"><ShieldCheck className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Clinic</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">My Clinic Card</h3><p className="mt-2 text-xs leading-5 text-[#71839a]">Your important health information, vitals, and connected care.</p><div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#e0ebef]"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Vitals</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">BMI {display(data.healthSnapshot?.bmi)} · {watchConnected ? "Watch connected" : "Manual vitals available"}</p></div><Weight className="h-5 w-5 text-[#24c1c4]" /></div><details className="mt-3 rounded-2xl bg-white ring-1 ring-[#e0ebef]"><summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-[#0b2d54]">Open vitals &amp; BMI</summary><div className="border-t border-[#e0ebef] px-1 pb-1"><WeightBodySizeCard weightKg={data.healthSnapshot?.weightKg} heightCm={data.healthSnapshot?.heightCm} bmi={data.healthSnapshot?.bmi} patientId={patientId} reload={reload} /></div></details><Link href="/health-passport" className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open clinic card</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>

          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#f2f7ff] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#3f75bd]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#edf4ff] text-[#3f75bd]"><FolderOpen className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">History</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">My History &amp; Papers</h3><p className="mt-2 text-xs leading-5 text-[#71839a]">Your health story, records, results, and documents in one place.</p><p className="mt-4 text-sm font-black text-[#0b2d54]">{historyCount} connected {historyCount === 1 ? "record" : "records"}</p><Link href="/health-journal" className="mt-6 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open health history</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>
        </section>
      </div>
    </main>
  </ProtectedRoute>;
}
