"use client";

import { Check, CircleSlash2, Pill } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  return `${dose} · ${frequency}`;
}

function patientMedicationId(medication: any) {
  return medication?.patientMedicationId || medication?.patientMedication?.id || medication?.id || null;
}

function medicationId(medication: any) {
  return medication?.medicationId || medication?.medication?.id || medication?.medication?.medicationId || null;
}

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (message) return message;
  return "We could not update this medication. Please try again.";
}

export default function TodayMedicationActions({ medications, onUpdated }: TodayMedicationActionsProps) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, Action | undefined>>({});

  async function record(medication: any, action: Action) {
    const patientMedicationRecordId = patientMedicationId(medication);
    const underlyingMedicationId = medicationId(medication);

    if (savingKey) return;

    if (!patientMedicationRecordId || !underlyingMedicationId) {
      toast.error("Medication record is incomplete", {
        description: "The medication record does not contain the IDs required to record adherence.",
      });
      return;
    }

    const key = String(patientMedicationRecordId);
    setSavingKey(`${key}:${action}`);

    try {
      const response = await api.post(`/patient-medications/${key}/adherence`, {
        medicationId: String(underlyingMedicationId),
        action,
        scheduledFor: new Date().toISOString(),
      });

      setStates((current) => ({ ...current, [key]: action }));
      const nextAdherence = response.data?.adherencePercentage;
      const suffix = typeof nextAdherence === "number"
        ? ` · ${Math.round(nextAdherence)}% overall adherence`
        : "";

      toast.success(action === "TAKEN" ? "Medication marked taken" : "Medication marked skipped", {
        description: `${medicationName(medication)}${suffix}`,
      });

      await onUpdated?.();
    } catch (error) {
      toast.error("Medication update failed", { description: errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  if (!medications.length) {
    return (
      <div className="mt-4 rounded-[20px] border border-dashed border-[#d8e7ea] bg-[#f7fbfb] p-4">
        <p className="text-sm font-bold text-[#0b2d54]">No active medication to manage today.</p>
        <p className="mt-1 text-xs leading-5 text-[#74859a]">Your medication goal is ready, but there is no active medicine attached to it yet.</p>
      </div>
    );
  }

  return (
    <div className="relative z-20 mt-4 overflow-hidden rounded-[20px] border border-[#e0ecef] bg-[#f8fbfc] pointer-events-auto">
      <div className="flex items-center justify-between gap-3 border-b border-[#e7eff1] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]">
            <Pill className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0b6f73]">Today&apos;s medication</p>
            <p className="mt-0.5 text-[11px] text-[#74859a]">Mark each medicine Taken or Skipped.</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#e8eff1]">
        {medications.map((medication, index) => {
          const key = String(patientMedicationId(medication) ?? index);
          const state = states[key];

          return (
            <div key={key} className="relative z-20 px-4 py-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0b2d54]">{medicationName(medication)}</p>
                  <p className="mt-1 text-[11px] text-[#74859a]">{medicationSchedule(medication)}</p>
                  {state && <p className="mt-1.5 text-[10px] font-bold text-[#168660]">{state === "TAKEN" ? "Marked taken today" : "Marked skipped today"}</p>}
                </div>
                <div className="relative z-30 flex shrink-0 gap-2 pointer-events-auto">
                  <button
                    type="button"
                    disabled={Boolean(savingKey)}
                    onClick={() => void record(medication, "TAKEN")}
                    className={`relative z-30 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition disabled:cursor-wait disabled:opacity-50 ${state === "TAKEN" ? "bg-[#168660] text-white" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {savingKey === `${key}:TAKEN` ? "Saving…" : "Taken"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingKey)}
                    onClick={() => void record(medication, "SKIPPED")}
                    className={`relative z-30 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black transition disabled:cursor-wait disabled:opacity-50 ${state === "SKIPPED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#d4e1e5] bg-white text-[#526779] hover:bg-[#f2f7f8]"}`}
                  >
                    <CircleSlash2 className="h-3.5 w-3.5" />
                    {savingKey === `${key}:SKIPPED` ? "Saving…" : "Skipped"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
