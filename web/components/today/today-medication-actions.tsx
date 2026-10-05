"use client";

import { Check, CircleSlash2, Pill } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const source = String(medication?.source ?? "").trim().toLowerCase();
  const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
  return medication?.patientMedicationId ||
    medication?.patientMedication?.id ||
    (source !== "prescription" && !syntheticPrescriptionId ? medication?.id : null) ||
    null;
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
  const [takenDosesForGoal, setTakenDosesForGoal] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, Action | undefined>>({});

  const trackedMedication = medications[0] ?? null;
  const finalGoal = (() => {
    if (!suppliedGoal) return null;

    const isGoalLive = new Set(["NOT_STARTED", "ACTIVE", "IN_PROGRESS", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"])
      .has(String(suppliedGoal.status).toUpperCase());
    const isMedicationGoal =
      String(suppliedGoal.metricType ?? "").toUpperCase() === "MEDICATION" ||
      String(suppliedGoal.category ?? "").toUpperCase() === "MEDICATION" ||
      String(suppliedGoal.metricConfig?.metricKey ?? "").toLowerCase() === "medication.adherence";

    return isGoalLive && isMedicationGoal ? suppliedGoal : null;
  })();

  const medicationId =
    patientMedicationId(trackedMedication) ??
    finalGoal?.patientMedicationId ??
    finalGoal?.patientMedication?.id ??
    finalGoal?.associatedPatientMedicationId ??
    finalGoal?.associatedPatientMedication?.id ??
    null;

  const medicationAnchorId =
    finalGoal?.patientMedicationId ??
    finalGoal?.patientMedication?.id ??
    finalGoal?.associatedPatientMedicationId ??
    finalGoal?.associatedPatientMedication?.id ??
    patientMedicationId(trackedMedication) ??
    null;
  const frequency = medicationFrequency(trackedMedication);
  const totalRequiredDosesPerDay = requiredDosesForFrequency(frequency);
  const safeDosesLoggedToday = Number.isFinite(Number(dosesLoggedToday))
    ? Math.max(0, Number(dosesLoggedToday))
    : 0;
  const percent = totalRequiredDosesPerDay > 0
    ? Math.min(100, Math.max(0, Math.round((safeDosesLoggedToday / totalRequiredDosesPerDay) * 100)))
    : 0;

  async function loadAdherenceEvents() {
    if (!medications.length || !medicationId) {
      setDosesLoggedToday(0);
      setTakenDosesForGoal(0);
      return;
    }

    try {
      const now = new Date();
      const goalStart = new Date(String(finalGoal?.createdAt ?? now));
      const from = Number.isNaN(goalStart.getTime()) ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : goalStart;
      const to = new Date(now.getTime() + 1000);
      const result = await healthGoalsService.getMetricEvents(
        "MEDICATION",
        "medication.adherence",
        from,
        to,
        "medication-adherence",
      );

      const medicationPrefix = String(medicationId) + ":";
      const medicationEvents = (result?.events ?? [])
        .filter((event) => String(event?.sourceId ?? "").startsWith(medicationPrefix))
        .sort((a, b) => new Date(String(a.occurredAt)).getTime() - new Date(String(b.occurredAt)).getTime());

      if (!medicationEvents.length) {
        setDosesLoggedToday(0);
        setTakenDosesForGoal(0);
        return;
      }

      // Each medication-adherence event represents exactly one recorded dose
      // action. Its loggedValue is the cumulative adherence percentage after
      // that action, so we can reconstruct cumulative TAKEN doses without
      // storing a second action field in HealthGoalMetricEvent.
      const { start: todayStart, end: tomorrowStart } = todayBounds();
      let cumulativeTakenBeforeToday = 0;
      let cumulativeTaken = 0;
      let todayTaken = 0;

      medicationEvents.forEach((event, index) => {
        const totalActions = index + 1;
        const adherence = Number(event?.loggedValue);
        const inferredTaken = Number.isFinite(adherence)
          ? Math.max(0, Math.min(totalActions, Math.round((totalActions * adherence) / 100)))
          : cumulativeTaken;

        cumulativeTaken = Math.max(cumulativeTaken, inferredTaken);
        const occurredAt = new Date(String(event?.occurredAt));
        if (occurredAt < todayStart) {
          cumulativeTakenBeforeToday = cumulativeTaken;
        } else if (occurredAt >= todayStart && occurredAt < tomorrowStart) {
          todayTaken = Math.max(todayTaken, cumulativeTaken - cumulativeTakenBeforeToday);
        }
      });

      setTakenDosesForGoal(Math.max(0, cumulativeTaken));
      setDosesLoggedToday(Math.min(totalRequiredDosesPerDay, Math.max(0, todayTaken)));
    } catch {
      // Keep the current UI if event history cannot be loaded.
    }
  }

  useEffect(() => {
    void loadAdherenceEvents();
  }, [medications.length, totalRequiredDosesPerDay, medicationId, finalGoal?.id]);

  const doseLabel = useMemo(
    () => (totalRequiredDosesPerDay === 1 ? "1 dose" : `${totalRequiredDosesPerDay} doses`),
    [totalRequiredDosesPerDay],
  );

  const rawTargetAdherence = Number(finalGoal?.targetValue);
  const targetAdherence =
    Number.isFinite(rawTargetAdherence) && rawTargetAdherence > 0
      ? rawTargetAdherence
      : 90;

  const { journeyDay, daysLeft } = journeyProgress(finalGoal);
  const fallbackTakenDoses = cumulativeTakenDoses(trackedMedication);
  const takenDosesSoFar = Math.max(0, takenDosesForGoal || fallbackTakenDoses);

  const [medicationInsight, setMedicationInsight] = useState<any | null>(null);
  const insightSyncRetriedForGoal = useRef<string | null>(null);

  async function loadMedicationInsight() {
    if (!finalGoal?.id) {
      setMedicationInsight(null);
      return;
    }

    try {
      const response = await api.get(
        `/patient-health-goals/${encodeURIComponent(String(finalGoal.id))}/medication-insight`,
      );
      setMedicationInsight(response.data?.data ?? response.data ?? null);
    } catch {
      setMedicationInsight(null);
    }
  }

  useEffect(() => {
    void loadMedicationInsight();
  }, [finalGoal?.id]);

  const journeyInsight = medicationInsight?.analysis?.journeyAdherence;
  const clinicalIntelligence = medicationInsight?.analysis?.clinicalIntelligence ?? null;

  useEffect(() => {
    if (!finalGoal?.id || !journeyInsight) return;

    const parentTakenCount = Math.max(0, Math.floor(Number(takenDosesSoFar) || 0));
    const serverTakenCount = Number(journeyInsight?.takenDoses ?? 0);
    const mismatch = parentTakenCount > 0 && serverTakenCount === 0;

    if (!mismatch || insightSyncRetriedForGoal.current === String(finalGoal.id)) return;

    insightSyncRetriedForGoal.current = String(finalGoal.id);

    void Promise.resolve(onUpdated?.())
      .finally(() => {
        void loadMedicationInsight();
      });
  }, [finalGoal?.id, journeyInsight?.takenDoses, takenDosesSoFar, onUpdated]);

  // Keep the medication card's validated cumulative numerator as the single source of truth.
  const insightExpectedScheduledDoses = Number(journeyInsight?.expectedScheduledDoses ?? 0);
  const insightTakenDoses = Math.max(0, Math.floor(Number(takenDosesSoFar) || 0));
  const insightAdherencePercent =
    insightExpectedScheduledDoses > 0
      ? Number(((insightTakenDoses / insightExpectedScheduledDoses) * 100).toFixed(2))
      : 0;

  // Never render a stale server-side zero when the parent card already has a positive count.
  const hasMeaningfulMedicationInsight =
    Boolean(journeyInsight) &&
    insightExpectedScheduledDoses > 0;



  if (!finalGoal) {
    return null;
  }
  const medicationCardAnchorId = medicationAnchorId
    ? `medication-adherence-card-${String(medicationAnchorId)}`
    : null;
  const ringSize = 96;
  const ringStroke = 9;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = Number.isFinite(percent) ? circumference * (1 - percent / 100) : circumference;

  async function record(medication: any, action: Action) {
    if (safeDosesLoggedToday >= totalRequiredDosesPerDay || isSyncing) return;
    const id = patientMedicationId(medication) ?? finalGoal?.patientMedicationId ?? finalGoal?.patientMedication?.id ?? null;
    if (!id) {
      toast.error("Medication record is incomplete", { description: "This medicine does not have a patient medication record ID." });
      return;
    }
    const key = String(id);
    setIsSyncing(true);
    setSavingKey(`${key}:${action}`);
    try {
      const response = await api.post(`/patient-medications/${key}/adherence`, { action, scheduledFor: new Date().toISOString() });
      if (response.data?.tracked === false) {
        toast.warning("Medication tracking is disabled", {
          description: response.data?.message || "Enable medication tracking in your Health Journal settings before recording adherence.",
        });
        return;
      }
      setStates((current) => ({ ...current, [key]: action }));
      await loadAdherenceEvents();
      const nextAdherence = response.data?.adherencePercentage;
      const journalUpdated = response.data?.journal?.updated;
      if (journalUpdated === false) {
        toast.warning(action === "TAKEN" ? "Medication saved" : "Medication skip saved", {
          description: "Your medication record was updated, but the Health Journal entry could not be updated.",
        });
      } else {
        toast.success(action === "TAKEN" ? "Medication marked taken" : "Medication marked skipped", {
          description: `${medicationName(medication)}${typeof nextAdherence === "number" ? ` · ${Math.round(nextAdherence)}% overall adherence` : ""}`,
        });
      }
      await onUpdated?.();
      await loadMedicationInsight();
    } catch (error) {
      toast.error("Medication update failed", { description: errorMessage(error) });
    } finally {
      setIsSyncing(false);
      setSavingKey(null);
    }
  }

  const goalTitle = finalGoal?.title || `${medicationName(trackedMedication)} adherence`;
  const scheduledGoalDoses = Math.max(0, Math.ceil((daysLeft !== null ? daysLeft + journeyDay - 1 : 30) * totalRequiredDosesPerDay));
  const targetDoseCount = Math.ceil((scheduledGoalDoses * targetAdherence) / 100);
  const dosesNeededForGoal = Math.max(0, targetDoseCount - takenDosesSoFar);
  const cardClass = "w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_14px_34px_rgba(11,45,84,.06)]";

  return (
    <section id={finalGoal?.id ? `health-goal-card-${String(finalGoal.id)}` : medicationAnchorId ?? "medication-adherence-card-unassigned"} className={cardClass}>
      {medicationAnchorId ? <span id={medicationCardAnchorId ?? undefined} className="block h-0 scroll-mt-24" aria-hidden="true" /> : null}
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Pill className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Medication</p><h3 className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{goalTitle}</h3></div></div><div className="shrink-0 text-right"><p className="text-sm font-black text-[#0b2d54]">{doseLabel}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.11em] text-[#8a99a6]">{percent}% today</p></div></header>

      <div className="mx-3.5 mb-3.5 rounded-[22px] bg-[#0b2d54] px-4 py-4 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:mx-4 sm:mb-4 sm:px-5 sm:py-4"><div className="flex items-center gap-4 sm:gap-5"><div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}><svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90"><circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={ringStroke} /><circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#24c1c4" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} /></svg><div className="absolute inset-0 grid place-items-center text-center"><p className="text-3xl font-black leading-none tracking-[-.07em]">{safeDosesLoggedToday}</p></div></div><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-[.15em] text-white/45">Today’s medication</p><p className="mt-1 truncate text-lg font-black tracking-[-.045em]">{medicationName(trackedMedication)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">{medicationSchedule(trackedMedication)}</p><div className="mt-2.5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-white/75 ring-1 ring-white/10">{safeDosesLoggedToday}/{totalRequiredDosesPerDay} doses today</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black text-[#b8ffff] ring-1 ring-white/10">{percent}% today</span></div></div></div><div className="mt-3.5 border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold text-white/60">{safeDosesLoggedToday >= totalRequiredDosesPerDay ? "All scheduled doses logged today." : `${totalRequiredDosesPerDay - safeDosesLoggedToday} dose${totalRequiredDosesPerDay - safeDosesLoggedToday === 1 ? "" : "s"} left to log today.`}</p><p className="text-[9px] font-black text-white/75">{Math.max(0, totalRequiredDosesPerDay - safeDosesLoggedToday)} left today</p></div></div></div>

      <div className="border-t border-[#edf2f5] px-4 py-3.5 sm:px-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#91a0ae]">Goal journey</p><p className="mt-0.5 text-[11px] font-black text-[#0b2d54]">Day {journeyDay}{daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}</p></div><div className="text-right"><p className="text-[10px] font-black text-[#0b7b80]">{targetAdherence}% adherence goal</p><p className="mt-0.5 text-[9px] font-semibold text-[#91a0ae]">Take at least {targetAdherence}% of your scheduled doses to reach this goal.</p></div></div><div className="mb-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: `${percent}%` }} /></div><div className="mb-3 rounded-[14px] bg-[#f7fbfb] px-3.5 py-3 ring-1 ring-[#e1ecef]"><div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#91a0ae]">Doses needed for your goal</p><p className="mt-0.5 text-[13px] font-black text-[#0b2d54]">{dosesNeededForGoal} more dose{dosesNeededForGoal === 1 ? "" : "s"}</p></div><p className="text-right text-[9px] font-bold text-[#7c8e9b]">{takenDosesSoFar} taken so far</p></div></div><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-[#7c8e9b]">Dose status</p><p className="mt-0.5 text-[10px] font-semibold text-[#9aa7b1]">{states[String(medicationId)] === "TAKEN" ? "Taken today" : states[String(medicationId)] === "SKIPPED" ? "Skipped today" : "Choose an action below"}</p></div><div className="grid w-[180px] grid-cols-2 gap-2"><button type="button" onClick={() => void record(trackedMedication, "TAKEN")} disabled={isSyncing || safeDosesLoggedToday >= totalRequiredDosesPerDay} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[13px] bg-[#24c1c4] px-3 text-[10px] font-black text-[#0b2d54] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"><Check className="h-3.5 w-3.5" />{savingKey === `${String(medicationId)}:TAKEN` ? "Saving" : "Taken"}</button><button type="button" onClick={() => void record(trackedMedication, "SKIPPED")} disabled={isSyncing || safeDosesLoggedToday >= totalRequiredDosesPerDay} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[13px] border border-[#dce7eb] bg-white px-3 text-[10px] font-black text-[#0b2d54] transition hover:bg-[#f7fbfb] disabled:cursor-not-allowed disabled:opacity-45"><CircleSlash2 className="h-3.5 w-3.5" />{savingKey === `${String(medicationId)}:SKIPPED` ? "Saving" : "Skipped"}</button></div></div></div>

      {hasMeaningfulMedicationInsight ? (
        <section className="mx-3.5 mb-3.5 rounded-[22px] border border-[#dce9ee] bg-[#f8fbfb] p-4 text-[#0b2d54] sm:mx-4 sm:mb-4 sm:p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#0b7b80]">Sympto insight</p>
            <h3 className="mt-1 text-base font-black tracking-[-.025em] text-[#0b2d54]">Clinical intelligence</h3>
            <p className="mt-1 text-[10px] leading-5 text-[#7c8e9b]">
              Longitudinal analysis of adherence, timing friction, and linked health-goal behavior.
            </p>
          </div>

          <div className="mt-3 rounded-[18px] border border-[#cfe8e6] bg-[#f4fbfb] px-3.5 py-3.5 ring-1 ring-[#dcefed] sm:px-4 sm:py-4">
            <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#0b7b80]">Primary signal</p>
            <p className="mt-1.5 text-[11px] font-black leading-5 text-[#0b2d54]">
              {clinicalIntelligence?.headline
                ? String(clinicalIntelligence.headline)
                : insightAdherencePercent < targetAdherence
                  ? `Your medication adherence is ${Math.round(insightAdherencePercent)}%, ${Math.round(targetAdherence - insightAdherencePercent)} percentage points below the ${Math.round(targetAdherence)}% goal.`
                  : `Your medication adherence is ${Math.round(insightAdherencePercent)}%, meeting the ${Math.round(targetAdherence)}% goal.`}
            </p>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="rounded-[18px] border border-[#d9e4ee] bg-white px-3.5 py-3.5 ring-1 ring-[#e8eef3] sm:px-4 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black leading-5 text-[#0b2d54]">Trajectory</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#5f7080]">
                    {Number(clinicalIntelligence?.trajectory?.takenDoses ?? insightTakenDoses)} of {Number(clinicalIntelligence?.trajectory?.expectedDosesToDate ?? insightExpectedScheduledDoses)} doses taken · {Math.round(Number(clinicalIntelligence?.trajectory?.adherencePercent ?? insightAdherencePercent))}% adherence.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-black text-[#0b7b80]">{Math.round(Number(clinicalIntelligence?.trajectory?.targetAdherencePercent ?? targetAdherence))}% target</p>
                  <p className="mt-0.5 text-[8px] font-bold text-[#91a0ae]">
                    {Math.round(Math.abs(Number(clinicalIntelligence?.trajectory?.variancePercentagePoints ?? 0)))} pp {String(clinicalIntelligence?.trajectory?.varianceType ?? "") === "BELOW_TARGET" ? "below" : String(clinicalIntelligence?.trajectory?.varianceType ?? "") === "ABOVE_TARGET" ? "above" : "on"} target
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[9px] font-semibold leading-4 text-[#8a99a6]">
                {Number(clinicalIntelligence?.trajectory?.elapsedLifecycleDays ?? 0)} elapsed lifecycle days · {Number(clinicalIntelligence?.trajectory?.dailyFrequency ?? totalRequiredDosesPerDay)} scheduled doses/day.
              </p>
              {Number(clinicalIntelligence?.trajectory?.remainingDosesNeededForTarget ?? 0) > 0 ? (
                <p className="mt-1 text-[9px] font-bold leading-4 text-[#b05c2b]">
                  {Number(clinicalIntelligence.trajectory.remainingDosesNeededForTarget)} additional taken doses are required across the goal lifetime to reach target adherence.
                </p>
              ) : null}
            </div>

            {clinicalIntelligence?.chronologicalInterference ? (
              <div className="rounded-[18px] border border-[#eadfd7] bg-[#fffaf6] px-3.5 py-3.5 ring-1 ring-[#f0e5dd] sm:px-4 sm:py-4">
                <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#9a633e]">Chronological interference</p>
                <p className="mt-1.5 text-[11px] font-black leading-5 text-[#0b2d54]">
                  {String(clinicalIntelligence.chronologicalInterference.statement)}
                </p>
              </div>
            ) : null}

            {Array.isArray(clinicalIntelligence?.crossGoalAssociations) ? (
              clinicalIntelligence.crossGoalAssociations
                .filter((item: any) => item?.meaningful === true && item?.statement)
                .map((item: any) => (
                  <div key={String(item.goalId)} className="rounded-[18px] border border-[#d9e4ee] bg-white px-3.5 py-3.5 ring-1 ring-[#e8eef3] sm:px-4 sm:py-4">
                    <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#0b7b80]">Behavioral association</p>
                    <p className="mt-1.5 text-[11px] font-black leading-5 text-[#0b2d54]">{String(item.statement)}</p>
                    {item.latestJournalValue != null && item.latestJournalDate ? (
                      <p className="mt-1 text-[8px] font-semibold leading-4 text-[#8a99a6]">
                        Latest linked observation: {String(item.latestJournalValue)}{item.unit ? ` ${String(item.unit)}` : ""} · {String(item.latestJournalDate)}.
                      </p>
                    ) : null}
                  </div>
                ))
            ) : null}

            {Array.isArray(clinicalIntelligence?.behavioralClusters) ? (
              clinicalIntelligence.behavioralClusters.map((cluster: any, index: number) => (
                <div key={`cluster-${index}`} className="rounded-[18px] border border-[#cfe8e6] bg-[#f4fbfb] px-3.5 py-3.5 ring-1 ring-[#dcefed] sm:px-4 sm:py-4">
                  <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#0b7b80]">Cross-goal cluster</p>
                  <p className="mt-1.5 text-[11px] font-black leading-5 text-[#0b2d54]">{String(cluster.statement)}</p>
                </div>
              ))
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
