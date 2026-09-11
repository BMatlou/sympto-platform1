"use client";

import { Check, CircleSlash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MedicationAdherenceActionsProps {
  medicationId: string;
  medicationName: string;
  adherencePercentage?: number | null;
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  if (responseMessage) return responseMessage;
  return "We could not update medication adherence. Please try again.";
}

export function MedicationAdherenceActions({ medicationId, medicationName, adherencePercentage }: MedicationAdherenceActionsProps) {
  const [saving, setSaving] = useState<"TAKEN" | "SKIPPED" | null>(null);
  const [adherence, setAdherence] = useState(adherencePercentage ?? null);

  async function record(action: "TAKEN" | "SKIPPED") {
    if (saving) return;
    setSaving(action);
    try {
      const response = await api.post(`/patient-medications/${medicationId}/adherence`, {
        action,
        scheduledFor: new Date().toISOString(),
      });
      const nextAdherence = response.data?.adherencePercentage;
      if (typeof nextAdherence === "number") setAdherence(nextAdherence);
      toast.success(action === "TAKEN" ? "Medication marked taken" : "Medication marked skipped", {
        description: medicationName,
      });
    } catch (error) {
      toast.error("Medication update failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Adherence</p>
          <p className="mt-1 text-sm font-bold text-[#0b2d54]">{adherence == null ? "Not recorded yet" : `${Math.round(adherence)}% overall`}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={Boolean(saving)} onClick={() => record("TAKEN")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            <Check className="h-3.5 w-3.5" />{saving === "TAKEN" ? "Saving…" : "Taken"}
          </button>
          <button type="button" disabled={Boolean(saving)} onClick={() => record("SKIPPED")} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
            <CircleSlash2 className="h-3.5 w-3.5" />{saving === "SKIPPED" ? "Saving…" : "Skipped"}
          </button>
        </div>
      </div>
    </div>
  );
}
