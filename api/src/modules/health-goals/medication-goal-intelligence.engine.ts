import { Injectable } from '@nestjs/common';
import type {
  MedicationDayBucket,
  MedicationSchedule,
  MedicationTrendResult,
} from './medication-insight.service';

export type MedicationGoalIntelligenceStatus =
  | 'ON_TARGET'
  | 'BEHIND_RECOVERABLE'
  | 'BEHIND_UNRECOVERABLE'
  | 'INSUFFICIENT_DATA'
  | 'NO_FUTURE_SCHEDULE';

export interface MedicationGoalIntelligence {
  status: MedicationGoalIntelligenceStatus;
  targetAdherencePercent: number;
  currentAdherencePercent: number;
  gapPercentagePoints: number;
  takenDoses: number;
  scheduledDoses: number;
  skippedDoses: number;
  unrecordedDoses: number;
  completedDays: number;
  targetDays: number;
  partialDays: number;
  missedDays: number;
  futureScheduledDoses: number | null;
  additionalDosesNeeded: number | null;
  requiredFutureAdherencePercent: number | null;
  projectedFinalAdherenceAtCurrentPace: number | null;
  trend: MedicationTrendResult;
  insight: string | null;
}

export interface MedicationGoalIntelligenceInput {
  targetAdherencePercent: number;
  targetDate: Date | null;
  now: Date;
  timezone: string;
  schedule: MedicationSchedule;
  dailyBuckets: MedicationDayBucket[];
  journeyAdherence: {
    takenDoses: number;
    expectedScheduledDoses: number;
    adherencePercent: number;
  };
  trend: MedicationTrendResult;
}

function localDay(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function addLocalDay(day: string): string {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function localWeekday(day: string): number {
  const sundayZero = new Date(`${day}T12:00:00Z`).getUTCDay();
  return sundayZero === 0 ? 7 : sundayZero;
}

function scheduleAppliesToDay(schedule: MedicationSchedule, day: string): boolean {
  const timezone = schedule.timezone || 'Africa/Johannesburg';
  if (schedule.startedAt && localDay(new Date(schedule.startedAt), timezone) > day) return false;
  if (schedule.endedAt && localDay(new Date(schedule.endedAt), timezone) < day) return false;
  if (
    Array.isArray(schedule.activeDaysOfWeek) &&
    schedule.activeDaysOfWeek.length > 0 &&
    !schedule.activeDaysOfWeek.includes(localWeekday(day))
  ) {
    return false;
  }
  return true;
}

function futureScheduledDoseCount(
  schedule: MedicationSchedule,
  now: Date,
  targetDate: Date | null,
): number | null {
  if (!targetDate) return null;

  const timezone = schedule.timezone || 'Africa/Johannesburg';
  const today = localDay(now, timezone);
  const endDay = localDay(targetDate, timezone);

  if (endDay <= today) return 0;

  let cursor = addLocalDay(today);
  let total = 0;

  for (let guard = 0; guard < 5000 && cursor <= endDay; guard += 1) {
    if (scheduleAppliesToDay(schedule, cursor)) {
      const frequency = String(schedule.frequency ?? '').trim().toUpperCase();
      const scheduleHasDailyDose =
        frequency !== 'AS_NEEDED' &&
        !((frequency === 'WEEKLY' || frequency === 'MONTHLY') && schedule.scheduleSource !== 'REMINDER_SCHEDULE');

      if (scheduleHasDailyDose) {
        total += Math.max(0, Number(schedule.dosesPerDay) || 0);
      }
    }

    if (cursor === endDay) break;
    cursor = addLocalDay(cursor);
  }

  return total;
}

function clampPercent(value: number): number {
  return Number(Math.max(0, Math.min(100, value)).toFixed(2));
}

export function calculateMedicationGoalIntelligence(
  input: MedicationGoalIntelligenceInput,
): MedicationGoalIntelligence {
  const target = Number.isFinite(Number(input.targetAdherencePercent))
    ? Math.max(1, Math.min(100, Number(input.targetAdherencePercent)))
    : 90;

  const current = clampPercent(Number(input.journeyAdherence.adherencePercent) || 0);
  const gap = Number((target - current).toFixed(2));
  const today = localDay(input.now, input.timezone);

  const eligibleDays = input.dailyBuckets.filter(
    (day) => day.day <= today && day.expectedDoses > 0,
  );

  const completedDays = eligibleDays.filter(
    (day) => day.takenDoses >= day.expectedDoses,
  ).length;

  const targetDays = eligibleDays.filter(
    (day) => day.adherencePercent >= target,
  ).length;

  const partialDays = eligibleDays.filter(
    (day) => day.takenDoses > 0 && day.takenDoses < day.expectedDoses,
  ).length;

  const missedDays = eligibleDays.filter(
    (day) => day.recordedActions === 0,
  ).length;

  const skippedDoses = eligibleDays.reduce(
    (sum, day) => sum + Math.max(0, Number(day.skippedDoses) || 0),
    0,
  );

  const unrecordedDoses = eligibleDays.reduce(
    (sum, day) => sum + Math.max(0, Number(day.unrecordedDoses) || 0),
    0,
  );

  const futureScheduledDoses = futureScheduledDoseCount(
    input.schedule,
    input.now,
    input.targetDate,
  );

  let additionalDosesNeeded: number | null = null;
  let requiredFutureAdherencePercent: number | null = null;
  let projectedFinalAdherenceAtCurrentPace: number | null = null;

  if (futureScheduledDoses != null) {
    const totalPlannedDoses =
      input.journeyAdherence.expectedScheduledDoses + futureScheduledDoses;

    const targetTotalDoses = Math.ceil((totalPlannedDoses * target) / 100);
    additionalDosesNeeded = Math.max(
      0,
      targetTotalDoses - input.journeyAdherence.takenDoses,
    );

    requiredFutureAdherencePercent =
      futureScheduledDoses > 0
        ? clampPercent((additionalDosesNeeded / futureScheduledDoses) * 100)
        : null;

    const currentPaceTaken = futureScheduledDoses * (current / 100);
    projectedFinalAdherenceAtCurrentPace =
      totalPlannedDoses > 0
        ? clampPercent(
            ((input.journeyAdherence.takenDoses + currentPaceTaken) /
              totalPlannedDoses) *
              100,
          )
        : null;
  }

  let status: MedicationGoalIntelligenceStatus = 'INSUFFICIENT_DATA';

  if (input.journeyAdherence.expectedScheduledDoses <= 0) {
    status = 'INSUFFICIENT_DATA';
  } else if (current >= target) {
    status = 'ON_TARGET';
  } else if (requiredFutureAdherencePercent == null) {
    status = 'NO_FUTURE_SCHEDULE';
  } else if (requiredFutureAdherencePercent <= 100) {
    status = 'BEHIND_RECOVERABLE';
  } else {
    status = 'BEHIND_UNRECOVERABLE';
  }

  let insight: string | null = null;

  if (status === 'ON_TARGET') {
    insight = `Your medication goal is currently on target at ${Math.round(current)}% adherence against a ${Math.round(target)}% goal.`;
  } else if (status === 'BEHIND_RECOVERABLE' && requiredFutureAdherencePercent != null) {
    insight =
      `Your medication goal is ${Math.round(Math.abs(gap))} percentage points below target at ${Math.round(current)}%. ` +
      `To finish at ${Math.round(target)}%, you need to take at least ${Math.round(requiredFutureAdherencePercent)}% of the remaining scheduled doses.`;
  } else if (status === 'BEHIND_UNRECOVERABLE' && requiredFutureAdherencePercent != null) {
    insight =
      `Your medication goal is ${Math.round(Math.abs(gap))} percentage points below target. ` +
      `The current schedule would require ${Math.round(requiredFutureAdherencePercent)}% of the remaining doses to reach ${Math.round(target)}%, which is above the available 100% maximum.`;
  }

  return {
    status,
    targetAdherencePercent: target,
    currentAdherencePercent: current,
    gapPercentagePoints: gap,
    takenDoses: input.journeyAdherence.takenDoses,
    scheduledDoses: input.journeyAdherence.expectedScheduledDoses,
    skippedDoses,
    unrecordedDoses,
    completedDays,
    targetDays,
    partialDays,
    missedDays,
    futureScheduledDoses,
    additionalDosesNeeded,
    requiredFutureAdherencePercent,
    projectedFinalAdherenceAtCurrentPace,
    trend: input.trend,
    insight,
  };
}

@Injectable()
export class MedicationGoalIntelligenceEngine {
  calculate(input: MedicationGoalIntelligenceInput): MedicationGoalIntelligence {
    return calculateMedicationGoalIntelligence(input);
  }
}
