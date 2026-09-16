"use client";

import { Check, CircleSlash2, Pill } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { healthGoalsService } from "@/services/health-goals.service";

interface TodayMedicationActionsProps {
  medications: any[];
  goal?: any;
  onUpdated?: () => Promise<void> | void;
}

type Action = "TAKEN" | "SKIPPED";

function medicationName(medication: any) {
  return medication?.medication?.name || medication?.medication?.genericName || medication?.name || "Your medicine";
}

function medicationSchedule(medication: any) {
  const dose = medication?.dosage || medication?.dose || "Dose not recorded";
  const frequency = medication?.frequency || medication?.schedule || "Schedule not recorded";
  return `${dose} · ${String(frequency).replaceAll("_", " ")}`;
}

function medicationFrequency(medication: any): string {
  return String(medication?.frequency || medication?.schedule || "").toUpperCase();
}

function requiredDosesForFrequency(frequency: string): number {
  if (frequency === "TWICE_DAILY") return 2;
  if (frequency === "THREE_TIMES_DAILY") return 3;
  if (frequency === "FOUR_TIMES_DAILY") return 4;
  return 1;
}

function patientMedicationId(medication: any) {
  return medication?.patientMedicationId || medication?.patientMedication?.id || medication?.id || null;
}

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (message) return message;
  return "We could not update this medication. Please try again.";
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function journeyProgress(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? Date.now()));
  const targetDate = goal?.targetDate ? new Date(String(goal.targetDate)) : null;
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
  const daysLeft = !targetDate || Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
  return { journeyDay, daysLeft };
}

function cumulativeTakenDoses(medication: any): number {
  const exactCandidates = [
    medication?.takenDoses,
    medication?.totalTakenDoses,
    medication?.adherence?.takenDoses,
    medication?.adherence?.totalTakenDoses,
  ];

  for (const value of exactCandidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }

  const adherence = Number(medication?.adherencePercentage ?? medication?.adherence?.percentage);
  const missed = Number(medication?.missedDoses ?? medication?.adherence?.missedDoses);

  if (!Number.isFinite(adherence) || !Number.isFinite(missed) || missed < 0 || adherence <= 0) return 0;
  if (adherence >= 100 && missed === 0) return 0;

  const roundedTarget = Number(adherence.toFixed(2));
  for (let total = Math.max(1, Math.ceil(missed)); total <= 10000; total += 1) {
    const taken = total - missed;
    if (taken < 0) continue;
    const calculated = Number(((taken / total) * 100).toFixed(2));
    if (calculated === roundedTarget) return taken;
  }

  return 0;
}

export default function TodayMedicationActions({ medications, goal: suppliedGoal, onUpdated }: TodayMedicationActionsProps) {
  const [dosesLoggedToday, setDosesLoggedToday] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, Action | undefined>>({});

  const trackedMedication = medications[0] ?? null;
  const medication = trackedMedication
    ? {
        ...trackedMedication,
        name: trackedMedication?.name || trackedMedication?.medication?.name || trackedMedication?.medication?.genericName || trackedMedication?.medication?.brandName || "",
      }
    : null;
  const activeMedicationGoals = suppliedGoal ? [suppliedGoal] : [];

  // 🔍 Overwrite the goal evaluation loop inside the component file:
  const finalGoal = activeMedicationGoals.find((goal: any) => {
    if (!goal) return false;

    // 1. Accept BOTH 'ACTIVE' and 'IN_PROGRESS' database status enums to bypass string filtering blocks
    const isGoalLive = 
      String(goal.status).toUpperCase() === 'ACTIVE' || 
      String(goal.status).toUpperCase() === 'IN_PROGRESS';
      
    if (!isGoalLive) return false;

    // 2. Direct Canonical ID Check
    const targetMedicationId = medication.patientMedicationId ?? medication.id;
    const matchesIdDirectly = goal.patientMedicationId === targetMedicationId;
    if (matchesIdDirectly) return true;

    // 3. Hybrid String-Matching Fallback for existing user goals
    const isMedicationGoal = 
      goal.metricType === 'MEDICATION' || 
      goal.category === 'MEDICATION' || 
      goal.title?.toLowerCase() === 'manage medication';
      
    const isPrimaryMetforminScript = medication.name?.toLowerCase().includes('metformin');
    const isGoalUnlinked = !goal.patientMedicationId;

    return isMedicationGoal && isPrimaryMetforminScript && isGoalUnlinked;
  }) || null;

  // 4. Strict Display Guard Checklist
  if (!finalGoal) {
    return null; // Keeps untracked scripts safely hidden
  }

  const medicationId = patientMedicationId(trackedMedication);
  const frequency = medicationFrequency(trackedMedication);
  const totalRequiredDosesPerDay = requiredDosesForFrequency(frequency);
  const percent = totalRequiredDosesPerDay > 0 ? Math.min(100, Math.round((dosesLoggedToday / totalRequiredDosesPerDay) * 100)) : 0;

  async function loadTodayEvents() {
    if (!medications.length) {
      setDosesLoggedToday(0);
      return;
    }
    try {
      const { start, end } = todayBounds();
      const result = await healthGoalsService.getMetricEvents("MEDICATION", "medication.adherence", start, end, "medication-adherence");
      setDosesLoggedToday(Math.min(totalRequiredDosesPerDay, result.count));
    } catch {
      // Keep the current UI if event history cannot be loaded.
    }
  }

  useEffect(() => {
    void loadTodayEvents();
  }, [medications.length, totalRequiredDosesPerDay]);

  const doseLabel = useMemo(() => (totalRequiredDosesPerDay === 1 ? "1 dose" : `${totalRequiredDosesPerDay} doses`), [totalRequiredDosesPerDay]);
  const { journeyDay, daysLeft } = journeyProgress(finalGoal);
  const medicationAnchorId = `medication-adherence-card-${String(medicationId ?? "unassigned")}`;
  const ringSize = 96;
  const ringStroke = 9;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  async function record(medication: any, action: Action) {
    if (dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing) return;
    const id = patientMedicationId(medication);
    if (!id) {
      toast.error("Medication record is incomplete", { description: "This medicine does not have a patient medication record ID." });
      return;
    }
    const key = String(id);
    setIsSyncing(true);
    setSavingKey(`${key}:${action}`);
    try {
      const response = await api.post(`/patient-medications/${key}/adherence`, { action, scheduledFor: new Date().toISOString() });
      setStates((current) => ({ ...current, [key]: action }));
      await loadTodayEvents();
      const nextAdherence = response.data?.adherencePercentage;
      toast.success(action === "TAKEN" ? "Medication marked taken" : "Medication marked skipped", {
        description: `${medicationName(medication)}${typeof nextAdherence === "number" ? ` · ${Math.round(nextAdherence)}% overall adherence` : ""}`,
      });
      await onUpdated?.();
    } catch (error) {
      toast.error("Medication update failed", { description: errorMessage(error) });
    } finally {
      setIsSyncing(false);
      setSavingKey(null);
    }
  }

  const goalTitle = finalGoal?.title || `${medicationName(trackedMedication)} adherence`;
  const targetAdherence = Number(finalGoal?.targetValue) || 90;
  const scheduledGoalDoses = Math.max(0, Math.ceil((daysLeft !== null ? daysLeft + journeyDay - 1 : 30) * totalRequiredDosesPerDay));
  const targetDoseCount = Math.ceil((scheduledGoalDoses * targetAdherence) / 100);
  const takenDosesSoFar = cumulativeTakenDoses(trackedMedication);
  const dosesNeededForGoal = Math.max(0, targetDoseCount - takenDosesSoFar);
  const cardClass = "w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_14px_34px_rgba(11,45,84,.06)]";

  return (
    <section id={medicationAnchorId} className={cardClass}>
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Pill className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Medication</p><h3 className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{goalTitle}</h3></div></div><div className="shrink-0 text-right"><p className="text-sm font-black text-[#0b2d54]">{doseLabel}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.11em] text-[#8a99a6]">{percent}% today</p></div></header>

      <div className="mx-3.5 mb-3.5 rounded-[22px] bg-[#0b2d54] px-4 py-4 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:mx-4 sm:mb-4 sm:px-5 sm:py-4"><div className="flex items-center gap-4 sm:gap-5"><div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}><svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90"><circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={ringStroke} /><circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#24c1c4" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} /></svg><div className="absolute inset-0 grid place-items-center text-center"><p className="text-3xl font-black leading-none tracking-[-.07em]">{dosesLoggedToday}</p></div></div><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-[.15em] text-white/45">Today’s medication</p><p className="mt-1 truncate text-lg font-black tracking-[-.045em]">{medicationName(trackedMedication)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">{medicationSchedule(trackedMedication)}</p><div className="mt-2.5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-white/75 ring-1 ring-white/10">{dosesLoggedToday}/{totalRequiredDosesPerDay} doses today</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-[#b8ffff] ring-1 ring-white/10">{percent}% today</span></div></div></div><div className="mt-3.5 border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold text-white/60">{dosesLoggedToday >= totalRequiredDosesPerDay ? "All scheduled doses logged today." : `${totalRequiredDosesPerDay - dosesLoggedToday} dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} left to log today.`}</p><p className="text-[9px] font-black text-white/75">{Math.max(0, totalRequiredDosesPerDay - dosesLoggedToday)} left today</p></div></div></div>

      <div className="border-t border-[#edf2f5] px-4 py-3.5 sm:px-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#91a0ae]">Goal journey</p><p className="mt-0.5 text-[11px] font-black text-[#0b2d54]">Day {journeyDay}{daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}</p></div><div className="text-right"><p className="text-[10px] font-black text-[#0b7b80]">{targetAdherence}% adherence goal</p><p className="mt-0.5 text-[9px] font-semibold text-[#91a0ae]">Take at least {targetAdherence}% of your scheduled doses to reach this goal.</p></div></div><div className="mb-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: `${percent}%` }} /></div><div className="mb-3 rounded-[14px] bg-[#f7fbfb] px-3.5 py-3 ring-1 ring-[#e1ecef]"><div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#91a0ae]">Doses needed for your goal</p><p className="mt-0.5 text-[13px] font-black text-[#0b2d54]">{dosesNeededForGoal} more dose{dosesNeededForGoal === 1 ? "" : "s"}</p></div><p className="text-right text-[9px] font-bold text-[#7c8e9b]">{takenDosesSoFar} taken so far</p></div></div><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-[#7c8e9b]">Dose status</p><p className="mt-0.5 text-[10px] font-semibold text-[#9aa7b1]">{states[String(medicationId)] === "TAKEN" ? "Taken today" : states[String(medicationId)] === "SKIPPED" ? "Skipped today" : "Choose an action below"}</p></div><div className="grid w-[180px] grid-cols-2 gap-2"><button type="button" onClick={() => void record(trackedMedication, "TAKEN")} disabled={isSyncing || dosesLoggedToday >= totalRequiredDosesPerDay} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[13px] bg-[#24c1c4] px-3 text-[10px] font-black text-[#0b2d54] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"><Check className="h-3.5 w-3.5" />{savingKey === `${String(medicationId)}:TAKEN` ? "Saving" : "Taken"}</button><button type="button" onClick={() => void record(trackedMedication, "SKIPPED")} disabled={isSyncing || dosesLoggedToday >= totalRequiredDosesPerDay} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[13px] border border-[#dce7eb] bg-white px-3 text-[10px] font-black text-[#0b2d54] transition hover:bg-[#f7fbfb] disabled:cursor-not-allowed disabled:opacity-45"><CircleSlash2 className="h-3.5 w-3.5" />{savingKey === `${String(medicationId)}:SKIPPED` ? "Saving" : "Skipped"}</button></div></div></div>
    </section>
  );
}
