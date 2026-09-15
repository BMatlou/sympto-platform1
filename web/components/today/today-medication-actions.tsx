"use client";

import Link from "next/link";
import { Check, CircleSlash2, Pill, Target, ArrowRight } from "lucide-react";
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
  if (frequency === "ONCE_DAILY") return 1;
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
  const targetDateValue = goal?.targetDate;
  const targetDate = targetDateValue ? new Date(String(targetDateValue)) : null;
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
  const daysLeft = !targetDate || Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
  return { journeyDay, daysLeft };
}

export default function TodayMedicationActions({ medications, goal, onUpdated }: TodayMedicationActionsProps) {
  const [dosesLoggedToday, setDosesLoggedToday] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, Action | undefined>>({});

  const trackedMedication = medications[0] ?? null;
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
      // Keep current UI if event history cannot be loaded.
    }
  }

  useEffect(() => {
    void loadTodayEvents();
  }, [medications.length, totalRequiredDosesPerDay]);

  const doseLabel = useMemo(() => (totalRequiredDosesPerDay === 1 ? "1 dose" : `${totalRequiredDosesPerDay} doses`), [totalRequiredDosesPerDay]);
  const { journeyDay, daysLeft } = journeyProgress(goal);
  const medicationAnchorId = `medication-goal-card-${String(patientMedicationId(trackedMedication) ?? "unassigned")}`;
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

  const goalTitle = goal?.title || "Medication adherence";
  const cardClass = "w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_14px_34px_rgba(11,45,84,.06)]";

  if (!medications.length) {
    return (
      <section id="medication-goal-card" className={cardClass}>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Target className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Medication</p>
            <h3 className="mt-0.5 truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">{goalTitle}</h3>
            <p className="mt-0.5 text-[10px] font-medium text-[#7c8e9b]">No active medicine scheduled today.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!goal) {
    return (
      <section id={medicationAnchorId} className={cardClass}>
        <header className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Pill className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Medication goal</p>
            <h3 className="mt-0.5 truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">Set a goal for {medicationName(trackedMedication)}</h3>
            <p className="mt-1 text-[10px] font-medium text-[#7c8e9b]">Choose an adherence target so your Today page can track this medicine against a clear goal.</p>
          </div>
        </header>

        <div className="mx-3.5 mb-3.5 rounded-[22px] bg-[#f7fbfb] p-4 ring-1 ring-[#e1ecef] sm:mx-4 sm:mb-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#91a0ae]">Today’s medicine</p><p className="mt-1 truncate text-lg font-black tracking-[-.045em] text-[#0b2d54]">{medicationName(trackedMedication)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#83939e]">{medicationSchedule(trackedMedication)}</p></div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#24c1c4] ring-1 ring-[#d9e9ec]"><Target className="h-5 w-5" /></span>
          </div>
          <Link href="/health-goals" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0b2d54] px-4 py-3 text-[10px] font-black text-white shadow-[0_9px_22px_rgba(11,45,84,.13)] transition hover:bg-[#123d63]">Set medication goal <ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section id={medicationAnchorId} className={cardClass}>
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Pill className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Medication</p><h3 className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{goalTitle}</h3></div>
        </div>
        <div className="shrink-0 text-right"><p className="text-sm font-black text-[#0b2d54]">{doseLabel}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.11em] text-[#8a99a6]">{percent}% complete</p></div>
      </header>

      <div className="mx-3.5 mb-3.5 rounded-[22px] bg-[#0b2d54] px-4 py-4 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:mx-4 sm:mb-4 sm:px-5 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={ringStroke} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#24c1c4" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center"><p className="text-3xl font-black leading-none tracking-[-.07em]">{dosesLoggedToday}</p></div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[.15em] text-white/45">Today’s medication</p>
            <p className="mt-1 truncate text-lg font-black tracking-[-.045em]">{medicationName(trackedMedication)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">{medicationSchedule(trackedMedication)}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-white/75 ring-1 ring-white/10">{dosesLoggedToday}/{totalRequiredDosesPerDay} doses</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-[#b8ffff] ring-1 ring-white/10">{percent}% complete</span></div>
          </div>
        </div>

        <div className="mt-3.5 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold text-white/50">{dosesLoggedToday >= totalRequiredDosesPerDay ? "All scheduled doses logged today." : `${totalRequiredDosesPerDay - dosesLoggedToday} dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} remaining today.`}</p><p className="text-[9px] font-black text-white/60">{Math.max(0, totalRequiredDosesPerDay - dosesLoggedToday)} remaining</p></div>
        </div>
      </div>

      {medications.map((medication, index) => {
        const key = String(patientMedicationId(medication) ?? index);
        const state = states[key];
        const isTrackedMedication = index === 0;
        const disabled = !isTrackedMedication || dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing;
        return (
          <div key={key} className="border-t border-[#edf2f5] px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#7c8e9b]">Dose status</p><p className="mt-0.5 text-[10px] font-semibold text-[#9aa7b1]">{state === "TAKEN" ? "Taken today" : state === "SKIPPED" ? "Skipped today" : "Choose an action below"}</p></div>
              <div className="grid w-[170px] shrink-0 grid-cols-2 gap-2"><button type="button" disabled={disabled} onClick={() => void record(medication, "TAKEN")} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[9px] font-black ${state === "TAKEN" ? "bg-[#168660] text-white" : "bg-[#0b2d54] text-white"}`}><Check className="h-3 w-3" />{savingKey === `${key}:TAKEN` ? "Saving…" : "Taken"}</button><button type="button" disabled={disabled} onClick={() => void record(medication, "SKIPPED")} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-[9px] font-black ${state === "SKIPPED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#d4e1e5] bg-white text-[#526779]"}`}><CircleSlash2 className="h-3 w-3" />{savingKey === `${key}:SKIPPED` ? "Saving…" : "Skipped"}</button></div>
            </div>
          </div>
        );
      })}

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f5] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8b3]">Journey</p><p className="mt-0.5 text-xs font-black text-[#0b2d54]">Day {journeyDay}{daysLeft !== null ? ` · ${daysLeft} days left` : ""}</p></div>
        <p className="text-right text-[9px] font-semibold text-[#74859a]">{dosesLoggedToday >= totalRequiredDosesPerDay ? "Medication complete today" : `${totalRequiredDosesPerDay - dosesLoggedToday} dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} remaining.`}</p>
      </footer>
    </section>
  );
}
