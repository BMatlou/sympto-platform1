"use client";

import { Check, CircleSlash2, Pill } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { healthGoalsService } from "@/services/health-goals.service";

interface TodayMedicationActionsProps {
  medications: any[];
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

export default function TodayMedicationActions({ medications, onUpdated }: TodayMedicationActionsProps) {
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
      // Keep the current UI when saved event history cannot be loaded.
    }
  }

  useEffect(() => {
    void loadTodayEvents();
  }, [medications.length, totalRequiredDosesPerDay]);

  const doseLabel = useMemo(() => {
    if (totalRequiredDosesPerDay === 1) return "1 dose";
    return `${totalRequiredDosesPerDay} doses`;
  }, [totalRequiredDosesPerDay]);

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

  if (!medications.length) {
    return <div className="overflow-hidden rounded-[28px] border border-[#dce9ee] bg-white shadow-[0_12px_34px_rgba(11,45,84,.045)]"><div className="p-6 sm:p-7"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b6f73]">Health goals</p><h3 className="mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]">Today&apos;s medication</h3><p className="mt-2 text-xs text-[#74859a]">No active medicine is scheduled for today.</p></div></div>;
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dce9ee] bg-white shadow-[0_12px_34px_rgba(11,45,84,.045)]">
      <div className="relative overflow-hidden border-b border-[#edf2f5] bg-gradient-to-br from-[#f7fcfc] via-white to-[#eef8f8] px-5 py-5 sm:px-7">
        <div className="absolute right-[-40px] top-[-70px] h-40 w-40 rounded-full bg-[#24c1c4]/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Pill className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b6f73]">Health goals</p><h3 className="mt-0.5 text-xl font-black tracking-[-.04em] text-[#0b2d54]">Today&apos;s medication</h3><p className="mt-1 text-xs text-[#74859a]">Mark each medicine Taken or Skipped.</p></div></div>
          <div className="shrink-0 rounded-2xl bg-white px-3.5 py-2.5 text-center shadow-sm ring-1 ring-[#e0ecef]"><p className="text-lg font-black leading-none text-[#0b2d54]">{doseLabel}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#7d8f9e]">{percent}% complete</p></div>
        </div>
      </div>

      <div className="divide-y divide-[#edf2f5]">
        {medications.map((medication, index) => {
          const key = String(patientMedicationId(medication) ?? index);
          const state = states[key];
          const isTrackedMedication = index === 0;
          const disabled = !isTrackedMedication || dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing;
          return <div key={key} className="px-5 py-4 sm:px-7 sm:py-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-[15px] font-black text-[#0b2d54]">{medicationName(medication)}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.03em] text-[#7a8d9b]">{medicationSchedule(medication)}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#f5f8fa] px-2.5 py-1.5 text-[10px] font-black text-[#647889]">{Math.min(dosesLoggedToday, totalRequiredDosesPerDay)}/{totalRequiredDosesPerDay} doses logged</span>{state && <span className={`rounded-full px-2.5 py-1.5 text-[10px] font-black ${state === "TAKEN" ? "bg-[#e9f8f1] text-[#168660]" : "bg-amber-50 text-amber-700"}`}>{state === "TAKEN" ? "Latest: Taken" : "Latest: Skipped"}</span>}</div></div><div className="flex shrink-0 gap-2"><button type="button" disabled={disabled} onClick={() => void record(medication, "TAKEN")} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${state === "TAKEN" ? "bg-[#168660] text-white" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}><Check className="h-3.5 w-3.5" />{savingKey === `${key}:TAKEN` ? "Saving…" : "Taken"}</button><button type="button" disabled={disabled} onClick={() => void record(medication, "SKIPPED")} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${state === "SKIPPED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#d4e1e5] bg-white text-[#526779] hover:bg-[#f3f7f8]"}`}><CircleSlash2 className="h-3.5 w-3.5" />{savingKey === `${key}:SKIPPED` ? "Saving…" : "Skipped"}</button></div></div></div>;
        })}
      </div>

      <div className="border-t border-[#edf2f5] bg-[#fbfdfd] px-5 py-4 sm:px-7">
        <p className="text-xs font-semibold text-[#74859a]">{dosesLoggedToday >= totalRequiredDosesPerDay ? "✓ All doses logged for today. Well done!" : `${totalRequiredDosesPerDay - dosesLoggedToday} dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} remaining today.`}</p>
      </div>
    </section>
  );
}
