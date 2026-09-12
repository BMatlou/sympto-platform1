"use client";

import { Check, CircleSlash2, Pill } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useDashboard } from "@/hooks/use-dashboard";

interface TodayMedicationActionsProps {
  medications: any[];
  onUpdated?: () => Promise<void> | void;
}

type Action = "TAKEN" | "SKIPPED";

type PerformanceStatus = "WORKING_WELL" | "PARTIALLY_ON_TRACK" | "NEEDS_ATTENTION";

function medicationName(medication: any) {
  return medication?.medication?.name || medication?.medication?.genericName || medication?.name || "Your medicine";
}

function medicationSchedule(medication: any) {
  const dose = medication?.dosage || medication?.dose || "Dose not recorded";
  const frequency = medication?.frequency || medication?.schedule || "Schedule not recorded";
  return `${dose} · ${frequency}`;
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

function formatTargetDate(value: unknown): string {
  if (!value) return "Not set";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function daysUntilTarget(value: unknown): number | null {
  if (!value) return null;
  const target = new Date(String(value));
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getGoalProgress(goal: any): number {
  const latestProgress = goal?.latestProgress ?? goal?.progress?.[0] ?? null;
  const rawProgress = Number(latestProgress?.progressPercent ?? goal?.progressPercent ?? 0);
  return Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, Math.round(rawProgress))) : 0;
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

export default function TodayMedicationActions({ medications, onUpdated }: TodayMedicationActionsProps) {
  const { data: dashboard } = useDashboard();
  const [dosesLoggedToday, setDosesLoggedToday] = useState(0);
  const [lastStatus, setLastStatus] = useState<Action | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, Action | undefined>>({});

  const trackedMedication = medications[0] ?? null;
  const frequency = medicationFrequency(trackedMedication);
  const totalRequiredDosesPerDay = requiredDosesForFrequency(frequency);
  const progressPercentage = Math.round((dosesLoggedToday / totalRequiredDosesPerDay) * 100);
  const medicationGoal = useMemo(
    () => (dashboard?.goals ?? []).find((goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION"),
    [dashboard?.goals],
  );
  const targetGoalDate = formatTargetDate(medicationGoal?.targetDate);
  const goalProgress = getGoalProgress(medicationGoal);
  const targetDaysRemaining = daysUntilTarget(medicationGoal?.targetDate);

  const performance = useMemo((): {
    status: PerformanceStatus;
    label: string;
    detail: string;
  } => {
    if (targetDaysRemaining !== null && targetDaysRemaining < 0) {
      return {
        status: "NEEDS_ATTENTION",
        label: "Behind target date",
        detail: "The target date has passed. Review the goal and update the plan if needed.",
      };
    }

    if (dosesLoggedToday >= totalRequiredDosesPerDay) {
      return {
        status: "WORKING_WELL",
        label: "Working well toward the target",
        detail: targetDaysRemaining === null
          ? "You completed today’s required doses. Keep the pattern going."
          : `${targetDaysRemaining} day${targetDaysRemaining === 1 ? "" : "s"} left to the target date. Keep this consistency going.`,
      };
    }

    if (dosesLoggedToday > 0) {
      return {
        status: "PARTIALLY_ON_TRACK",
        label: "Partially on track",
        detail: `${dosesLoggedToday}/${totalRequiredDosesPerDay} doses logged today. Complete the remaining dose${totalRequiredDosesPerDay - dosesLoggedToday === 1 ? "" : "s"} to stay on track.`,
      };
    }

    return {
      status: "NEEDS_ATTENTION",
      label: "Needs attention",
      detail: targetDaysRemaining === null
        ? "No dose has been logged today. Start with your first scheduled dose."
        : `${targetDaysRemaining} day${targetDaysRemaining === 1 ? "" : "s"} left to the target date. Start today’s medication check-in.`,
    };
  }, [dosesLoggedToday, targetDaysRemaining, totalRequiredDosesPerDay]);

  const performanceClasses = {
    WORKING_WELL: "bg-[#e9f8f1] text-[#168660] ring-[#cdeedf]",
    PARTIALLY_ON_TRACK: "bg-amber-50 text-amber-700 ring-amber-200",
    NEEDS_ATTENTION: "bg-red-50 text-red-700 ring-red-200",
  } as const;

  const getGuidanceMessage = () => {
    if (dosesLoggedToday === 0) return "Today: mark each dose Taken or Skipped below.";
    if (dosesLoggedToday === 1 && totalRequiredDosesPerDay > 1) return "Logged first dose. 1 dose left for today.";
    return "✓ All doses logged for today. Well done!";
  };

  async function record(medication: any, action: Action) {
    if (dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing) return;

    const patientMedicationRecordId = patientMedicationId(medication);
    if (!patientMedicationRecordId) {
      toast.error("Medication record is incomplete", {
        description: "This medicine does not have a patient medication record ID.",
      });
      return;
    }

    const key = String(patientMedicationRecordId);
    setIsSyncing(true);
    setSavingKey(`${key}:${action}`);

    try {
      const response = await api.post(`/patient-medications/${key}/adherence`, {
        action,
        scheduledFor: new Date().toISOString(),
      });

      setDosesLoggedToday((current) => Math.min(totalRequiredDosesPerDay, current + 1));
      setLastStatus(action);
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
      setIsSyncing(false);
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

  const trackedMedicationKey = String(patientMedicationId(trackedMedication) ?? 0);
  const trackedState = states[trackedMedicationKey];

  return (
    <div className="relative z-20 mt-4 overflow-hidden rounded-[20px] border border-[#e0ecef] bg-[#f8fbfc] pointer-events-auto">
      <div className="border-b border-[#e7eff1] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]">
            <Pill className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0b6f73]">Today&apos;s medication</p>
            <p className="mt-0.5 text-[11px] text-[#74859a]">Mark each medicine Taken or Skipped.</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#dce9ec]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-black text-[#0b2d54]">🎯 Target Date: {targetGoalDate} ({medicationGoal ? "1 active goal" : "no active goal found"})</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${performanceClasses[performance.status]}`}>
              {performance.label}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-[#71839a]">
            <span>{progressPercentage}% today</span>
            <span>{goalProgress}% goal progress · {dosesLoggedToday}/{totalRequiredDosesPerDay} doses</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf2f5]">
            <div className="h-full rounded-full bg-[#24c1c4] transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#74859a]">{performance.detail}</p>
        </div>
      </div>

      <div className="divide-y divide-[#e8eff1]">
        {medications.map((medication, index) => {
          const key = String(patientMedicationId(medication) ?? index);
          const state = states[key];
          const isTrackedMedication = index === 0;
          const buttonsDisabled = !isTrackedMedication || dosesLoggedToday >= totalRequiredDosesPerDay || isSyncing;

          return (
            <div key={key} className="relative z-20 px-4 py-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0b2d54]">{medicationName(medication)}</p>
                  <p className="mt-1 text-[11px] text-[#74859a]">{medicationSchedule(medication)}</p>
                  {isTrackedMedication && <p className="mt-2 text-[11px] font-semibold text-[#526779]">{getGuidanceMessage()}</p>}
                  {state && <p className="mt-1.5 text-[10px] font-bold text-[#168660]">{state === "TAKEN" ? "Marked taken today" : "Marked skipped today"}</p>}
                </div>
                <div className="relative z-30 flex shrink-0 gap-2 pointer-events-auto">
                  <button
                    type="button"
                    disabled={buttonsDisabled}
                    onClick={() => void record(medication, "TAKEN")}
                    className={`relative z-30 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${state === "TAKEN" ? "bg-[#168660] text-white" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {savingKey === `${key}:TAKEN` ? "Saving…" : "Taken"}
                  </button>
                  <button
                    type="button"
                    disabled={buttonsDisabled}
                    onClick={() => void record(medication, "SKIPPED")}
                    className={`relative z-30 inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${state === "SKIPPED" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-[#d4e1e5] bg-white text-[#526779] hover:bg-[#f2f7f8]"}`}
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
