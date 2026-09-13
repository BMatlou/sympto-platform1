"use client";

import { Check, CircleSlash2, Pill, Target } from "lucide-react";
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
  const cardClass = "w-full overflow-hidden rounded-[24px] border border-[#dce9ee] bg-white shadow-[0_5px_18px_rgba(11,45,84,.03)]";

  if (!medications.length) {
    return (
      <section className={cardClass}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf4ff] text-[#0b2d54]"><Target className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Medication</p>
              <h3 className="mt-1 truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{goalTitle}</h3>
              <p className="mt-1 text-xs text-[#74859a]">No active medicine scheduled today.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="relative border-b border-[#edf2f5] bg-gradient-to-br from-[#f7fcfc] via-white to-[#eef8f8] px-5 py-4">
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Pill className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Medication</p>
              <h3 className="truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{goalTitle}</h3>
            </div>
          </div>
          <div className="shrink-0 text-right"><p className="text-sm font-black leading-none text-[#0b2d54]">{doseLabel}</p><p className="mt-1 text-[9px] font-bold text-[#7d8f9e]">{percent}% complete</p></div>
        </div>
      </div>

      <div className="px-5 py-4">
        {medications.map((medication, index) => {
          const key = String(patientMedicationId(medication) ?? index);
          const state = states[key];
          const isTrackedMedication = index === 0;
          const disabled = !isTrackedMedication || dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing;
          return <div key={key} className="flex flex-col gap-3"><div className="min-w-0"><p className="truncate text-[14px] font-black text-[#0b2d54]">{medicationName(medication)}</p><p className="mt-1 text-[11px] font-semibold text-[#7a8d9b]">{medicationSchedule(medication)}</p><span className="mt-2 inline-flex rounded-full bg-[#f5f8fa] px-2 py-1 text-[9px] font-black text-[#647889]">{Math.min(dosesLoggedToday, totalRequiredDosesPerDay)}/{totalRequiredDosesPerDay} doses</span></div><div className="grid grid-cols-2 gap-2"><button type="button" disabled={disabled} onClick={() => void record(medication, "TAKEN")} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${state === "TAKEN" ? "bg-[#168660] text-white" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}><Check className="h-3 w-3" />{savingKey === `${key}:TAKEN` ? "Saving…" : "Taken"}</button><button type="button" disabled={disabled} onClick={() => void record(medication, "SKIPPED")} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border px-3 py-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${state === "SKIPPED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#d4e1e5] bg-white text-[#526779] hover:bg-[#f3f7f8]"}`}><CircleSlash2 className="h-3 w-3" />{savingKey === `${key}:SKIPPED` ? "Saving…" : "Skipped"}</button></div></div>;
        })}
      </div>

      <div className="border-t border-[#edf2f5] bg-[#fbfdfd] px-5 py-3">
        <p className="text-[11px] font-semibold text-[#74859a]">{dosesLoggedToday >= totalRequiredDosesPerDay ? "✓ All doses logged today." : `${totalRequiredDosesPerDay - dosesLoggedToday} dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} remaining.`}</p>
      </div>
    </section>
  );
}
