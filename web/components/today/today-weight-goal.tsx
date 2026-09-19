"use client";

import Link from "next/link";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatKg(value: number | null) {
  return value == null ? "—" : Number(value).toFixed(1);
}

function formatRate(value: number | null) {
  return value == null ? "—" : Math.abs(value) < 0.1 ? Number(value).toFixed(2) : Number(value).toFixed(1);
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function journeyFor(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? ""));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const now = Date.now();
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1);
  const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000));
  const totalDays = !Number.isNaN(startDate.getTime()) && !Number.isNaN(targetDate.getTime()) ? Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / 86400000)) : null;
  return { startDate, targetDate, journeyDay, daysLeft, totalDays };
}

type Props = { goal: any; fallbackWeight?: number | string | null };
type WeightEvent = { loggedValue: number; occurredAt: string; source?: string | null; sourceId?: string | null };

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<WeightEvent[]>([]);
  const [baselineWeight, setBaselineWeight] = useState<number | null>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const goalId = String(goal?.id ?? "");
        const response = await healthGoalsService.getMetricEvents("WEIGHT", "weight.kg", new Date(0), new Date());
        let intelligenceResult: any = null;
        try {
          intelligenceResult = goalId ? await healthGoalsService.getWeightGoalIntelligence(goalId) : null;
        } catch {
          intelligenceResult = null;
        }
        if (!active) return;
        setIntelligence(intelligenceResult);
        const all = (response.events ?? [])
          .map((event) => ({
            loggedValue: Number(event.loggedValue),
            occurredAt: String(event.occurredAt),
            source: event.source,
            sourceId: event.sourceId,
          }))
          .filter((event) => Number.isFinite(event.loggedValue) && !Number.isNaN(new Date(event.occurredAt).getTime()))
          .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

        const goalBaseline = all.find((event) => event.source === "goal-baseline" && event.sourceId === goalId);
        const goalCreatedAt = new Date(String(goal?.createdAt ?? ""));
        const baselineFromHistory = !Number.isNaN(goalCreatedAt.getTime())
          ? [...all].reverse().find((event) => event.source !== "goal-baseline" && new Date(event.occurredAt).getTime() <= goalCreatedAt.getTime())
          : null;

        const regular = all.filter((event) => event.source !== "goal-baseline");
        setBaselineWeight(goalBaseline?.loggedValue ?? baselineFromHistory?.loggedValue ?? null);
        setEvents(regular);
      } catch {
        if (active) {
          setEvents([]);
          setBaselineWeight(null);
          setIntelligence(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const onWeightUpdated = () => { void load(); };
    const onGoalUpdated = () => { void load(); };
    window.addEventListener("sympto:weight-updated", onWeightUpdated);
    window.addEventListener("sympto:health-goal-updated", onGoalUpdated);
    window.addEventListener("sympto:health-checkin-updated", onWeightUpdated);
    return () => {
      active = false;
      window.removeEventListener("sympto:weight-updated", onWeightUpdated);
      window.removeEventListener("sympto:health-goal-updated", onGoalUpdated);
    };
  }, [goal?.id, goal?.createdAt]);

  const journey = useMemo(() => journeyFor(goal), [goal]);
  const comparison = String(goal?.metricConfig?.comparison ?? goal?.comparison ?? "DECREASE_TO").toUpperCase();
  const isMaintenanceGoal = comparison === "CLOSEST";
  const configuredTarget = numberValue(goal?.metricConfig?.frequencyTarget ?? goal?.targetValue);
  const fallback = numberValue(fallbackWeight);
  const patientWeight = numberValue(goal?.patient?.weightKg);
  const currentEvent = events[events.length - 1] ?? null;
  const intelligenceWeight = numberValue(intelligence?.weight?.latestKg);
  const intelligenceBaseline = numberValue(intelligence?.profile?.baselineWeightKg);
  const currentWeight = currentEvent?.loggedValue ?? intelligenceWeight ?? fallback ?? patientWeight;
  const startingWeight = baselineWeight ?? intelligenceBaseline ?? patientWeight ?? currentWeight;
  const targetAmount = isMaintenanceGoal ? null : configuredTarget != null && configuredTarget > 0 ? configuredTarget : null;
  const intelligenceTargetWeight = numberValue(intelligence?.weight?.targetWeightKg);
  const targetWeight = intelligenceTargetWeight
    ?? (comparison === "INCREASE_TO" && startingWeight != null && targetAmount != null ? startingWeight + targetAmount : null)
    ?? (comparison === "DECREASE_TO" && startingWeight != null && targetAmount != null ? startingWeight - targetAmount : null)
    ?? (isMaintenanceGoal && startingWeight != null ? startingWeight : null);
  const goalCompleted = String(goal?.status ?? "").toUpperCase() === "ACHIEVED";
  const completedWeight = numberValue(goal?.currentValue ?? goal?.latestProgress?.currentValue ?? goal?.progress?.[0]?.currentValue);
  const journeyWeight = goalCompleted ? completedWeight ?? currentWeight : currentWeight;
  const changeKg = startingWeight != null && journeyWeight != null ? journeyWeight - startingWeight : null;
  const lostKg = comparison === "DECREASE_TO" && startingWeight != null && journeyWeight != null ? Math.max(startingWeight - journeyWeight, 0) : null;
  const gainedKg = comparison === "INCREASE_TO" && startingWeight != null && journeyWeight != null ? Math.max(journeyWeight - startingWeight, 0) : null;
  const actualChange = comparison === "DECREASE_TO" ? lostKg : gainedKg;
  const weekAgo = Date.now() - 7 * 86400000;
  const olderThanWeek = [...events].reverse().find((event) => new Date(event.occurredAt).getTime() <= weekAgo);
  const weeklyChangeKg = olderThanWeek && currentWeight != null ? currentWeight - olderThanWeek.loggedValue : null;
  const expectedProgress = journey.totalDays != null && journey.totalDays > 0 ? Math.min(100, Math.max(0, ((journey.journeyDay - 1) / journey.totalDays) * 100)) : null;
  const maintenanceStatus = String(intelligence?.weight?.status ?? "INSUFFICIENT_DATA").toUpperCase();
  const maintenanceStable = intelligence?.weight?.withinMaintenanceBand === true || maintenanceStatus === "STABLE";
  const maintenanceAverage = numberValue(intelligence?.weight?.average7dKg) ?? currentWeight;
  const maintenanceTolerance = startingWeight != null ? Math.max(0.5, Math.abs(startingWeight) * 0.02) : null;
  const maintenanceProgress = isMaintenanceGoal && startingWeight != null && maintenanceAverage != null && maintenanceTolerance != null
    ? Math.round(Math.max(50, Math.min(100, 100 - (Math.abs(maintenanceAverage - startingWeight) / maintenanceTolerance) * 50)))
    : 0;

  const targetReached = isMaintenanceGoal ? false : goalCompleted || (targetWeight != null && journeyWeight != null && (comparison === "DECREASE_TO" ? journeyWeight <= targetWeight : journeyWeight >= targetWeight));
  const totalPlannedChange = !isMaintenanceGoal && targetWeight != null && startingWeight != null
    ? Math.abs(targetWeight - startingWeight)
    : null;
  const directedMovement = !isMaintenanceGoal && startingWeight != null && journeyWeight != null
    ? comparison === "DECREASE_TO"
      ? startingWeight - journeyWeight
      : journeyWeight - startingWeight
    : null;
  const directionalProgress = !isMaintenanceGoal && totalPlannedChange != null
    ? totalPlannedChange === 0
      ? targetWeight != null && journeyWeight != null && Math.abs(journeyWeight - targetWeight) <= 0.5 ? 100 : 0
      : Math.max(-100, Math.min(100, ((directedMovement ?? 0) / totalPlannedChange) * 100))
    : 0;
  const progress = isMaintenanceGoal
    ? maintenanceProgress
    : goalCompleted
      ? 100
      : directionalProgress;
  const progressMagnitude = Math.min(100, Math.abs(progress));
  const progressLabel = isMaintenanceGoal
    ? `${progress}% stability`
    : `${progress > 0 ? "+" : ""}${progress}% progress`;
  const progressMovingAway = !isMaintenanceGoal && !goalCompleted && progress < 0;
  const onTrack = isMaintenanceGoal
    ? maintenanceStable
    : goalCompleted || targetReached || expectedProgress == null || progress >= expectedProgress - 10;
  const weeksLeft = journey.daysLeft != null ? journey.daysLeft / 7 : null;
  const remainingGoalAmount = isMaintenanceGoal
    ? 0
    : goalCompleted
      ? 0
      : targetWeight != null && journeyWeight != null
        ? comparison === "DECREASE_TO"
          ? Math.max(journeyWeight - targetWeight, 0)
          : Math.max(targetWeight - journeyWeight, 0)
        : null;
  const requiredWeeklyChange = goalCompleted || targetReached ? 0 : remainingGoalAmount != null && weeksLeft && weeksLeft > 0 ? remainingGoalAmount / weeksLeft : null;
  const requiredDailyChange = goalCompleted || targetReached ? 0 : remainingGoalAmount != null && journey.daysLeft != null && journey.daysLeft > 0 ? remainingGoalAmount / journey.daysLeft : null;
  const heightCm = numberValue(intelligence?.profile?.heightCm ?? goal?.patient?.heightCm ?? goal?.heightCm);
  const currentBmi = currentWeight != null && heightCm != null && heightCm > 0 ? currentWeight / ((heightCm / 100) ** 2) : null;
  const startingBmi = startingWeight != null && heightCm != null && heightCm > 0 ? startingWeight / ((heightCm / 100) ** 2) : null;
  const targetBmi = targetWeight != null && heightCm != null && heightCm > 0 ? targetWeight / ((heightCm / 100) ** 2) : null;
  const bmiChange = startingBmi != null && currentBmi != null ? currentBmi - startingBmi : null;
  const lowerScreeningWeight = numberValue(intelligence?.weight?.lowerScreeningWeightKg) ?? (heightCm != null && heightCm > 0 ? 18.5 * ((heightCm / 100) ** 2) : null);
  const upperScreeningWeight = numberValue(intelligence?.weight?.upperScreeningWeightKg) ?? (heightCm != null && heightCm > 0 ? 24.9 * ((heightCm / 100) ** 2) : null);
  const bmiCaution = !goalCompleted && comparison === "DECREASE_TO" && targetBmi != null && targetBmi < 18.5;
  const gainTargetCaution = !goalCompleted && comparison === "INCREASE_TO" && targetBmi != null && targetBmi >= 25;
  const gainTargetObesityRange = gainTargetCaution && targetBmi != null && targetBmi >= 30;
  const currentBmiBelowRange = !goalCompleted && currentBmi != null && currentBmi < 18.5;
  const currentBmiAboveRange = currentBmi != null && currentBmi >= 25;
  const goalNeedsReview = !goalCompleted && (bmiCaution || gainTargetCaution || (currentBmiBelowRange && comparison === "DECREASE_TO"));
  const reviewGoalHref = goal?.id ? `/health-goals?edit=${encodeURIComponent(String(goal.id))}` : "/health-goals";
  const ChangeIcon = isMaintenanceGoal ? Scale : comparison === "INCREASE_TO" ? TrendingUp : TrendingDown;
  const connectedGoals = Array.isArray(goal?.connectedGoals) ? goal.connectedGoals : [];
  const supportingGoals = connectedGoals.filter((relation: any) => relation.relationshipType === "SUPPORTS" && relation.direction === "supportsThisGoal");  const relatedGoals = connectedGoals.filter((relation: any) => relation.relationshipType === "RELATED_TO" && relation.direction === "relatedToThisGoal");

  const journeyLabel = goalCompleted    ? completedWeight != null
      ? `Goal completed at ${formatKg(completedWeight)} kg`      : "Goal completed"
    : isMaintenanceGoal
      ? maintenanceStatus === "NEEDS_REVIEW"
        ? "Weight trend needs review"
        : maintenanceStatus === "DRIFTING_UP"
          ? "Weight trend moving upward"
          : maintenanceStatus === "DRIFTING_DOWN"
            ? "Weight trend moving downward"
            : maintenanceStatus === "INSUFFICIENT_DATA"
              ? "Not enough recent weight data"
              : "Maintaining your baseline"
      : targetReached
        ? "Target reached"
        : comparison === "DECREASE_TO"
          ? changeKg != null && changeKg > 0
            ? `${formatKg(changeKg)} kg gained from ${formatKg(startingWeight)} kg · moving away from target`
            : `${formatKg(lostKg)} kg lost from ${formatKg(startingWeight)} kg`
          : changeKg != null && changeKg < 0
            ? `${formatKg(Math.abs(changeKg))} kg lost from ${formatKg(startingWeight)} kg · moving away from target`
            : `${formatKg(gainedKg)} kg gained from ${formatKg(startingWeight)} kg`;

  const targetLabel = goalCompleted
    ? `Completed · target body weight ${formatKg(targetWeight)} kg`
    : isMaintenanceGoal
      ? `Maintenance baseline · ${formatKg(startingWeight)} kg`
      : bmiCaution || gainTargetCaution
        ? `Goal needs review · planned change ${formatKg(targetAmount)} kg · projected weight ${formatKg(targetWeight)} kg`
        : `${formatKg(remainingGoalAmount)} kg remaining · requested change ${formatKg(targetAmount)} kg · projected weight ${formatKg(targetWeight)} kg`;

  const trendMessage = goalCompleted
    ? "This goal is complete. Later weight measurements do not change its 100% progress; start a new weight goal for a new journey."
    : isMaintenanceGoal
      ? intelligence?.weight?.average7dKg != null
        ? `Maintenance view: your 7-day average is ${formatKg(Number(intelligence.weight.average7dKg))} kg against a ${formatKg(startingWeight)} kg baseline. Trend: ${maintenanceStatus.toLowerCase().replaceAll("_", " ")}.`
        : "Maintenance view: Sympto needs more recent weight measurements before it can judge the trend reliably."
      : comparison === "DECREASE_TO"
        ? changeKg != null && changeKg > 0
          ? `Current trend: moving away from your weight target. You have gained ${formatKg(changeKg)} kg since the goal started, and BMI has increased from ${startingBmi?.toFixed(1) ?? "—"} to ${currentBmi?.toFixed(1) ?? "—"}.`
          : changeKg != null && changeKg < 0
            ? `Current trend: moving toward your weight target. You have lost ${formatKg(Math.abs(changeKg))} kg since the goal started, and BMI has changed from ${startingBmi?.toFixed(1) ?? "—"} to ${currentBmi?.toFixed(1) ?? "—"}.`
            : `Current trend: no recorded weight change from the ${formatKg(startingWeight)} kg starting point. BMI is ${currentBmi?.toFixed(1) ?? "—"}.`
        : changeKg != null && changeKg < 0
          ? `Current trend: moving away from your weight target. You have lost ${formatKg(Math.abs(changeKg))} kg since the goal started, and BMI has decreased from ${startingBmi?.toFixed(1) ?? "—"} to ${currentBmi?.toFixed(1) ?? "—"}.`
          : changeKg != null && changeKg > 0
            ? `Current trend: moving toward your weight target. You have gained ${formatKg(changeKg)} kg since the goal started, and BMI has changed from ${startingBmi?.toFixed(1) ?? "—"} to ${currentBmi?.toFixed(1) ?? "—"}.`
            : `Current trend: no recorded weight change from the ${formatKg(startingWeight)} kg starting point. BMI is ${currentBmi?.toFixed(1) ?? "—"}.`;

  const guidanceMessage = gainTargetCaution
    ? `Your planned target of ${formatKg(targetWeight)} kg corresponds to a BMI of ${targetBmi?.toFixed(1) ?? "—"} at your recorded height, which is outside the adult healthy-weight screening range. ${gainTargetObesityRange ? "It is in the adult obesity BMI screening category." : "It is in the adult overweight BMI screening category."} This is a screening signal, not a diagnosis; BMI does not distinguish muscle from fat. Review the target with a healthcare professional before pursuing it.`
    : isMaintenanceGoal
      ? intelligence?.weight?.average7dKg != null
      ? `Sympto is using your 7-day average rather than a single scale reading. Your maintenance band is approximately ${formatKg(intelligence.weight.maintenanceBand?.min ?? startingWeight)}–${formatKg(intelligence.weight.maintenanceBand?.max ?? startingWeight)} kg around your baseline.`
      : "Record a few recent weight measurements so Sympto can assess your maintenance trend."
    : currentBmi != null && currentBmi < 18.5
      ? `Your current BMI is ${currentBmi?.toFixed(1)}, below the adult underweight screening threshold of 18.5. Sympto should shift guidance toward healthy weight gain rather than further weight loss. At your recorded height, BMI 18.5 corresponds to about ${formatKg(lowerScreeningWeight)} kg. BMI is a screening measure, not a diagnosis.`
      : bmiCaution
        ? `Your current BMI is ${currentBmi?.toFixed(1)}, while the planned target BMI would be ${targetBmi?.toFixed(1)}, below 18.5. Sympto will not encourage further loss toward ${formatKg(targetWeight)} kg. The next step is to review this goal and either revise the target or switch to a weight-gain/maintenance focus. At your recorded height, BMI 18.5 corresponds to about ${formatKg(lowerScreeningWeight)} kg. BMI is a screening measure, not a diagnosis.`
        : currentBmiAboveRange
          ? `BMI now ${currentBmi?.toFixed(1)} is at or above 25. Interpret this screening measure alongside the person's wider health information.`
          : null;

  const statusLabel = goalCompleted
    ? "Completed"
    : gainTargetCaution || bmiCaution
      ? "Target needs review"
      : isMaintenanceGoal
      ? maintenanceStatus === "NEEDS_REVIEW"
        ? "Needs review"
        : maintenanceStatus === "DRIFTING_UP" || maintenanceStatus === "DRIFTING_DOWN"
          ? "Trend changing"
          : maintenanceStatus === "INSUFFICIENT_DATA"
            ? "Building baseline"
            : "On track"
      : currentBmiBelowRange
        ? "Gain weight focus"
        : bmiCaution
          ? "Goal needs review"
          : targetReached
            ? "Target reached"
            : onTrack
              ? "On track"
              : "Needs attention";

  const displayWeight = goalCompleted ? completedWeight ?? currentWeight : currentWeight;
  const displayLastRecordedDate = goalCompleted ? formatDate(goal?.achievedAt ?? goal?.progress?.[0]?.measuredAt ?? currentEvent?.occurredAt) : formatDate(currentEvent?.occurredAt);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]"><Scale className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title ?? "Weight")}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Weight goal</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${goalCompleted ? "bg-[#eaf8ef] text-[#168660]" : goalNeedsReview ? "bg-[#fff6e5] text-[#a26204]" : targetReached ? "bg-[#eaf8ef] text-[#168660]" : onTrack ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#fff6e5] text-[#a26204]"}`}>{statusLabel}</span>
      </div>

      <div className="flex-1 px-4 pb-5 sm:px-5 sm:pb-6">
        {loading ? (
          <div className="h-[250px] animate-pulse rounded-[26px] bg-[#f5f9fa]" />
        ) : currentWeight == null || startingWeight == null || (!isMaintenanceGoal && targetWeight == null) ? (
          <div className="rounded-[26px] bg-[#0b2d54] p-6 text-white shadow-[0_14px_30px_rgba(11,45,84,.14)]">
            <p className="text-xl font-black tracking-[-.04em]">Weight progress will update automatically</p>
            <p className="mt-2 text-sm leading-6 text-white/65">Record your weight in Vitals &amp; Measurements and Sympto will use that measurement here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[27px] bg-[#0b2d54] text-white shadow-[0_16px_34px_rgba(11,45,84,.16)]">
            <div className="relative p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#24c1c4]/18 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-90px] left-1/3 h-48 w-48 rounded-full bg-[#24c1c4]/10 blur-3xl" />
              <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">{goalCompleted ? "Completed at" : "Latest recorded weight"}</p>
                  <p className="mt-2 text-[48px] font-black leading-none tracking-[-.08em]">{formatKg(displayWeight)}<span className="ml-1.5 text-lg font-bold tracking-normal text-white/55">kg</span></p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80 ring-1 ring-white/10">{targetLabel}</span>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${goalCompleted || (!progressMovingAway && (targetReached || maintenanceStable)) ? "bg-[#24c1c4]/20 text-[#7de6e7]" : progressMovingAway ? "bg-[#f59e0b]/20 text-[#ffd58a]" : "bg-white/10 text-white/70 ring-1 ring-white/10"}`}>{progressLabel}</span>
                  </div>
                </div>
                <div className="mx-auto sm:mx-0">
                  <div className="relative grid h-[132px] w-[132px] place-items-center rounded-full" style={{ background: `conic-gradient(${progressMovingAway ? "#f59e0b" : "#24c1c4"} 0 ${progressMagnitude}%, rgba(255,255,255,.12) ${progressMagnitude}% 100%)` }}>
                    <div className="absolute inset-[9px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
                    <div className="relative z-10 text-center"><p className="text-[30px] font-black leading-none tracking-[-.07em]">{isMaintenanceGoal ? progress : `${progress > 0 ? "+" : ""}${progress}%`}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-white/45">{isMaintenanceGoal ? "stability" : progressMovingAway ? "moving away" : "progress"}</p></div>
                  </div>
                </div>
              </div>
              <div className="relative mt-6 border-t border-white/10 pt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Journey</p>
                    <p className="mt-1 text-sm font-bold text-white">{journeyLabel}</p>
                  </div>
                  {journey.daysLeft !== null && !goalCompleted && <p className="text-right text-[10px] font-bold text-white/50">{journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
              <div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Starting</p><p className="mt-1.5 text-sm font-black text-white">{formatKg(startingWeight)} kg</p></div>
              <div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Change</p><p className="mt-1.5 inline-flex items-center gap-1 text-sm font-black text-white"><ChangeIcon className="h-3.5 w-3.5 text-[#7de6e7]" />{changeKg == null ? "—" : `${changeKg > 0 ? "+" : ""}${formatKg(changeKg)} kg`}</p></div>
              <div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">{goalCompleted ? "Completed" : "Last recorded"}</p><p className="mt-1.5 text-sm font-black text-white">{displayLastRecordedDate}</p></div>
              <div className="px-4 py-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">{goalCompleted ? "BMI at completion" : "BMI now"}</p><p className="mt-1.5 text-sm font-black text-white">{(goalCompleted ? (completedWeight != null && heightCm != null && heightCm > 0 ? completedWeight / ((heightCm / 100) ** 2) : null) : currentBmi) == null ? "—" : (goalCompleted ? (completedWeight != null && heightCm != null && heightCm > 0 ? completedWeight / ((heightCm / 100) ** 2) : null) : currentBmi)!.toFixed(1)}</p></div>
            </div>
          </div>
        )}

        {!loading && !goalCompleted && !isMaintenanceGoal && currentWeight != null && !bmiCaution && targetAmount != null && remainingGoalAmount != null && (
          <div className="mt-4 rounded-[20px] border border-[#e1eaed] bg-[#f8fbfc] px-4 py-3.5 text-[10px] font-semibold leading-5 text-[#74859a]">
            {targetReached
              ? "Goal reached. You need 0.0 kg/day (0.0 kg/week) more."
              : comparison === "DECREASE_TO"
                ? `You need to lose about ${formatKg(remainingGoalAmount)} kg more to reach ${formatKg(targetWeight)} kg by ${formatDate(journey.targetDate)}. That is about ${formatRate(requiredDailyChange)} kg/day or ${formatRate(requiredWeeklyChange)} kg/week.`
                : `You need to gain about ${formatKg(remainingGoalAmount)} kg more to reach ${formatKg(targetWeight)} kg by ${formatDate(journey.targetDate)}. That is about ${formatRate(requiredDailyChange)} kg/day or ${formatRate(requiredWeeklyChange)} kg/week.`}
          </div>
        )}

        {!loading && connectedGoals.length > 0 && (
          <div className="mt-4 rounded-[18px] border border-[#e1eaed] bg-[#f8fbfc] px-4 py-3 text-[10px] leading-5 text-[#74859a]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-black uppercase tracking-[.12em] text-[#82939f]">Connected goals</span>
              {supportingGoals.length > 0 && <span className="font-semibold text-[#0b6f73]">Supporting: {supportingGoals.map((relation: any) => String(relation.goal?.title ?? relation.goal?.category ?? "Goal")).join(" · ")}</span>}
              {relatedGoals.length > 0 && <span className="font-semibold text-[#74859a]">Related: {relatedGoals.map((relation: any) => String(relation.goal?.title ?? relation.goal?.category ?? "Goal")).join(" · ")}</span>}
            </div>
          </div>
        )}

        {!loading && intelligence?.todayFocus?.actions?.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-[20px] border border-[#dbeaec] bg-[#f7fbfc]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e3eef0] px-4 py-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#82939f]">Today’s focus</p>
                <p className="mt-0.5 text-[11px] font-bold text-[#0b2d54]">One useful next step for this weight goal</p>
              </div>
              {intelligence?.todayFocus?.dataFreshness?.checkInNeedsCompletion && <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black text-[#0b7b80] ring-1 ring-[#dbeaec]">Check-in missing</span>}
            </div>            <div className="px-4 py-3">
              {intelligence.todayFocus.actions[0]?.priority === "PRIMARY" && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0b2d54]">{intelligence.todayFocus.actions[0].label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[#74859a]">{intelligence.todayFocus.actions[0].description}</p>                  </div>                  <Link href={intelligence.todayFocus.actions[0].href} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[9px] font-black text-white shadow-sm transition hover:bg-[#123d63]">
                    Open <ArrowRight className="h-3 w-3 text-[#24c1c4]" />
                  </Link>
                </div>
              )}
              {intelligence.todayFocus.actions.slice(1).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {intelligence.todayFocus.actions.slice(1, 3).map((action: any) => (
                    <Link key={String(action.id)} href={String(action.href)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[#0b6f73] ring-1 ring-[#dcebed] hover:bg-[#eff8f8]" title={String(action.description ?? "")}>
                      {String(action.label)} <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && currentWeight != null && ((guidanceMessage || bmiCaution || gainTargetCaution) || goalCompleted) && (
          <div className={`mt-4 rounded-[20px] border px-4 py-3.5 text-[10px] font-semibold leading-5 ${goalCompleted ? "border-[#dcebed] bg-[#f4fbfa] text-[#496a73]" : goalNeedsReview ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#dcebed] bg-[#f4fbfa] text-[#496a73]"}`}>
            <p className="font-black uppercase tracking-[.12em]">{goalCompleted ? "Completed weight goal" : "Weight &amp; BMI guidance"}</p>
            <p className="mt-1.5">{trendMessage}</p>
            {!goalCompleted && guidanceMessage && <p className="mt-1.5">{guidanceMessage}</p>}
            {!goalCompleted && bmiChange != null && Math.abs(bmiChange) >= 0.1 && <p className="mt-1.5">BMI change since goal start: {bmiChange > 0 ? "+" : ""}{bmiChange.toFixed(1)}.</p>}
            {!goalCompleted && gainTargetCaution && upperScreeningWeight != null && <p className="mt-1.5">At your recorded height, BMI 24.9 corresponds to about {formatKg(upperScreeningWeight)} kg. This is screening context, not a required target.</p>}
            {!goalCompleted && (bmiCaution || gainTargetCaution) && <>
              <p className="mt-1.5">{bmiCaution ? `The planned target BMI is ${targetBmi?.toFixed(1)}, below 18.5. The goal remains saved while you review what to do next.` : `The planned target BMI is ${targetBmi?.toFixed(1)}, outside the adult healthy-weight screening range${gainTargetObesityRange ? " and in the obesity screening category" : ""}. The goal remains saved while you review what to do next.`}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={reviewGoalHref} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[10px] font-black text-white shadow-sm transition hover:bg-[#123d63]">Review goal <ArrowRight className="h-3 w-3" /></Link>
              </div>
            </>}
          </div>
        )}
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]">
          <span>{goalCompleted ? "Completed journey" : `Day ${journey.journeyDay} · ${journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}`}</span>
          {goalCompleted ? <Link href="/health-goals" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54] hover:bg-white">New goal <ArrowRight className="h-3 w-3" /></Link> : <Link href="/health-goals" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54] hover:bg-white">View goal <ArrowRight className="h-3 w-3" /></Link>}
        </div>
        <p className="mt-2 text-[9px] leading-4 text-[#9aa8b1]">For weight goals, the measurement recorded when this goal was created or last revised is the baseline. Lose and Gain goals use an absolute target body weight; Maintenance goals use recent weight averages and trend rather than requiring an exact daily match to the baseline. Completed weight goals remain at 100% as history.</p>
      </div>
    </article>
  );
}