import type {
  ConnectedSupportingGoal,
  MedicationDayBucket,
  SupportEventRow,
} from './medication-insight.service';

export type MedicationComparisonEvidence =
  | 'STRONG'
  | 'EMERGING'
  | 'EARLY'
  | 'INSUFFICIENT_DATA';

export type MedicationComparisonStatus =
  | 'ON_TARGET'
  | 'BELOW_TARGET'
  | 'ABOVE_TARGET'
  | 'INSUFFICIENT_DATA';

export interface MedicationDoseEventForComparison {
  patientMedicationId: string;
  occurredAt: Date;
  action: 'TAKEN' | 'SKIPPED';
}

export interface MedicationComparisonGroup {
  calendarDays: number;
  takenDoses: number;
  scheduledDoses: number;
  adherencePercent: number | null;
}

export interface ConnectedGoalInsight {
  supportingGoalId: string;
  supportingGoalName: string;
  supportingGoalCategory: ConnectedSupportingGoal['category'];
  targetValue: number | null;
  unit: string;
  frequency: string;
  comparison: string;
  aggregation: string;
  observedPeriods: number;
  targetMetPeriods: number;
  targetMissedPeriods: number;
  latestValue: number | null;
  latestPeriodLabel: string | null;
  latestStatus: MedicationComparisonStatus;

  onTarget: MedicationComparisonGroup;
  offTarget: MedicationComparisonGroup;

  medicationAdherenceOnTargetPeriods: number | null;
  medicationAdherenceOnMissedTargetPeriods: number | null;
  medicationDeltaPercentagePoints: number | null;

  comparisonCoverageDays: number;
  comparisonCoversEntireEligibleJourney: boolean;
  comparisonValid: boolean;
  comparisonSuppressedReason: string | null;
  evidenceLevel: MedicationComparisonEvidence;
  insight: string | null;
}

export interface MedicationConnectedGoalsInput {
  patientMedicationId: string;
  doseEvents: MedicationDoseEventForComparison[];
  scheduledDays: MedicationDayBucket[];
  supportingGoals: ConnectedSupportingGoal[];
  supportingGoalEvents: SupportEventRow[];
  now: Date;
  timezone: string;
}

type SupportingGoalPeriod = {
  key: string;
  startDay: string;
  endDay: string;
  label: string;
  value: number;
  status: MedicationComparisonStatus;
  days: string[];
};

type ValidatedComparison = {
  comparisonValid: boolean;
  reason: string | null;
  delta: number | null;
};

export class MedicationConnectedGoalsEngine {
  calculate(input: MedicationConnectedGoalsInput): ConnectedGoalInsight[] {
    const today = dayKey(input.now, input.timezone);
    const eligibleMedicationDays = input.scheduledDays.filter(
      (day) => day.expectedDoses > 0 && day.day <= today,
    );

    const takenByDay = this.buildTakenDoseMap(
      input.doseEvents,
      input.patientMedicationId,
      input.timezone,
    );

    return input.supportingGoals.map((goal) =>
      this.calculateForGoal({
        goal,
        today,
        eligibleMedicationDays,
        takenByDay,
        supportEvents: input.supportingGoalEvents,
        timezone: input.timezone,
      }),
    );
  }

  private calculateForGoal(input: {
    goal: ConnectedSupportingGoal;
    today: string;
    eligibleMedicationDays: MedicationDayBucket[];
    takenByDay: Map<string, number>;
    supportEvents: SupportEventRow[];
    timezone: string;
  }): ConnectedGoalInsight {
    const goalEvents = input.supportEvents
      .filter((event) => event.healthGoalId === input.goal.healthGoalId)
      .filter((event) => Number.isFinite(Number(event.loggedValue)))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const periods = this.buildSupportingGoalPeriods(
      goalEvents,
      input.goal,
      input.timezone,
    );
    const completedPeriods = periods.filter((period) => {
      const frequency = input.goal.frequency.toUpperCase();
      if (frequency === 'WEEKLY' && period.endDay >= input.today) return false;
      if (frequency !== 'WEEKLY' && period.endDay > input.today) return false;
      if (
        frequency === 'WEEKLY' &&
        period.startDay < dayKey(new Date(input.goal.createdAt), input.timezone)
      ) {
        return false;
      }
      return true;
    });

    const latestPeriod = completedPeriods.at(-1) ?? null;
    const latestStatus = latestPeriod?.status ?? 'INSUFFICIENT_DATA';

    const periodByDay = new Map<string, SupportingGoalPeriod>();
    for (const period of completedPeriods) {
      for (const day of period.days) {
        periodByDay.set(day, period);
      }
    }

    const onTargetDays = input.eligibleMedicationDays.filter(
      (day) => periodByDay.get(day.day)?.status === 'ON_TARGET',
    );
    const offTargetDays = input.eligibleMedicationDays.filter((day) => {
      const status = periodByDay.get(day.day)?.status;
      return status === 'BELOW_TARGET' || status === 'ABOVE_TARGET';
    });

    const onTarget = this.aggregateMedicationDays(
      onTargetDays,
      input.takenByDay,
    );
    const offTarget = this.aggregateMedicationDays(
      offTargetDays,
      input.takenByDay,
    );

    const comparisonCoverageDays = onTarget.calendarDays + offTarget.calendarDays;
    const comparisonCoversEntireEligibleJourney =
      comparisonCoverageDays === input.eligibleMedicationDays.length &&
      input.eligibleMedicationDays.every((day) => periodByDay.has(day.day));

    const overallEligible = this.aggregateMedicationDays(
      input.eligibleMedicationDays,
      input.takenByDay,
    );

    const validation = this.validateComparison({
      onTarget,
      offTarget,
      comparisonCoverageDays,
      eligibleJourneyDays: input.eligibleMedicationDays.length,
      comparisonCoversEntireEligibleJourney,
      overallAdherencePercent: overallEligible.adherencePercent,
    });

    const evidenceLevel = this.evidenceLevel(
      completedPeriods.length,
      onTarget.calendarDays,
      offTarget.calendarDays,
    );

    const insight =
      validation.comparisonValid && validation.delta != null
        ? this.buildAssociationInsight(
            input.goal.title,
            validation.delta,
            onTarget,
            offTarget,
            evidenceLevel,
          )
        : latestStatus !== 'INSUFFICIENT_DATA'
          ? this.buildLatestStatusInsight(input.goal.title, latestStatus)
          : null;

    const targetPeriods = completedPeriods.filter(
      (period) => period.status === 'ON_TARGET',
    );
    const missedPeriods = completedPeriods.filter(
      (period) =>
        period.status === 'BELOW_TARGET' || period.status === 'ABOVE_TARGET',
    );

    return {
      supportingGoalId: input.goal.healthGoalId,
      supportingGoalName: input.goal.title,
      supportingGoalCategory: input.goal.category,
      targetValue: input.goal.frequencyTarget,
      unit: metricUnit(input.goal.metricKey),
      frequency: input.goal.frequency,
      comparison: input.goal.comparison,
      aggregation: input.goal.aggregation,
      observedPeriods: completedPeriods.length,
      targetMetPeriods: targetPeriods.length,
      targetMissedPeriods: missedPeriods.length,
      latestValue: latestPeriod?.value ?? null,
      latestPeriodLabel: latestPeriod?.label ?? null,
      latestStatus,
      onTarget,
      offTarget,
      medicationAdherenceOnTargetPeriods: onTarget.adherencePercent,
      medicationAdherenceOnMissedTargetPeriods: offTarget.adherencePercent,
      medicationDeltaPercentagePoints: validation.delta,
      comparisonCoverageDays,
      comparisonCoversEntireEligibleJourney,
      comparisonValid: validation.comparisonValid,
      comparisonSuppressedReason: validation.reason,
      evidenceLevel,
      insight,
    };
  }

  private buildTakenDoseMap(
    events: MedicationDoseEventForComparison[],
    patientMedicationId: string,
    timezone: string,
  ): Map<string, number> {
    const takenByDay = new Map<string, number>();

    for (const event of events) {
      if (
        String(event.patientMedicationId) !== String(patientMedicationId) ||
        event.action !== 'TAKEN'
      ) {
        continue;
      }

      const day = dayKey(event.occurredAt, timezone);
      if (!day) continue;
      takenByDay.set(day, (takenByDay.get(day) ?? 0) + 1);
    }

    return takenByDay;
  }

  private aggregateMedicationDays(
    days: MedicationDayBucket[],
    takenByDay: Map<string, number>,
  ): MedicationComparisonGroup {
    let scheduledDoses = 0;
    let takenDoses = 0;

    for (const day of days) {
      const scheduled = Math.max(0, Number(day.expectedDoses) || 0);
      const taken = Math.max(
        0,
        Math.min(scheduled, Number(takenByDay.get(day.day) ?? 0)),
      );
      scheduledDoses += scheduled;
      takenDoses += taken;
    }

    return {
      calendarDays: days.length,
      takenDoses,
      scheduledDoses,
      adherencePercent:
        scheduledDoses > 0
          ? Number(((takenDoses / scheduledDoses) * 100).toFixed(2))
          : null,
    };
  }

  private validateComparison(input: {
    onTarget: MedicationComparisonGroup;
    offTarget: MedicationComparisonGroup;
    comparisonCoverageDays: number;
    eligibleJourneyDays: number;
    comparisonCoversEntireEligibleJourney: boolean;
    overallAdherencePercent: number | null;
  }): ValidatedComparison {
    if (input.onTarget.calendarDays < 2 || input.offTarget.calendarDays < 2) {
      return {
        comparisonValid: false,
        reason: 'Each comparison group needs at least two completed calendar days.',
        delta: null,
      };
    }

    if (input.onTarget.scheduledDoses <= 0 || input.offTarget.scheduledDoses <= 0) {
      return {
        comparisonValid: false,
        reason: 'Both comparison groups need scheduled medication doses.',
        delta: null,
      };
    }

    if (
      input.onTarget.takenDoses > input.onTarget.scheduledDoses ||
      input.offTarget.takenDoses > input.offTarget.scheduledDoses
    ) {
      return {
        comparisonValid: false,
        reason: 'Taken doses exceed scheduled doses in a comparison group.',
        delta: null,
      };
    }

    const onTargetPercent = input.onTarget.adherencePercent;
    const offTargetPercent = input.offTarget.adherencePercent;

    if (onTargetPercent == null || offTargetPercent == null) {
      return {
        comparisonValid: false,
        reason: 'Adherence could not be calculated for both comparison groups.',
        delta: null,
      };
    }

    const delta = Number((onTargetPercent - offTargetPercent).toFixed(2));

    if (Math.abs(delta) < 0.01) {
      return {
        comparisonValid: false,
        reason: 'There is no measurable adherence difference between the joined groups.',
        delta: 0,
      };
    }

    if (
      input.comparisonCoversEntireEligibleJourney &&
      input.overallAdherencePercent != null
    ) {
      const joinedExpected =
        input.onTarget.scheduledDoses + input.offTarget.scheduledDoses;
      const joinedTaken =
        input.onTarget.takenDoses + input.offTarget.takenDoses;
      const joinedPercent =
        joinedExpected > 0
          ? Number(((joinedTaken / joinedExpected) * 100).toFixed(2))
          : null;

      if (
        joinedPercent == null ||
        Math.abs(joinedPercent - input.overallAdherencePercent) > 0.01
      ) {
        return {
          comparisonValid: false,
          reason:
            'The date-joined comparison does not reconcile with the medication journey adherence.',
          delta: null,
        };
      }
    }

    return {
      comparisonValid: true,
      reason: null,
      delta,
    };
  }

  private evidenceLevel(
    observedPeriods: number,
    onTargetDays: number,
    offTargetDays: number,
  ): MedicationComparisonEvidence {
    const comparableDays = onTargetDays + offTargetDays;

    if (observedPeriods >= 6 && comparableDays >= 8) return 'STRONG';
    if (observedPeriods >= 3 && comparableDays >= 4) return 'EMERGING';
    if (observedPeriods >= 2 && onTargetDays >= 2 && offTargetDays >= 2) {
      return 'EARLY';
    }
    return 'INSUFFICIENT_DATA';
  }

  private buildAssociationInsight(
    title: string,
    delta: number,
    onTarget: MedicationComparisonGroup,
    offTarget: MedicationComparisonGroup,
    evidence: MedicationComparisonEvidence,
  ): string | null {
    if (evidence === 'INSUFFICIENT_DATA') return null;

    const direction = delta > 0 ? 'higher' : 'lower';
    return (
      'Medication adherence was ' +
      Math.abs(Math.round(delta)) +
      ' percentage points ' +
      direction +
      ' when ' +
      title +
      ' was on target versus off target (' +
      Math.round(onTarget.adherencePercent ?? 0) +
      '% vs ' +
      Math.round(offTarget.adherencePercent ?? 0) +
      '%) across the matched days.'
    );
  }

  private buildLatestStatusInsight(
    title: string,
    status: MedicationComparisonStatus,
  ): string | null {
    if (status === 'INSUFFICIENT_DATA') return null;
    return status === 'ON_TARGET'
      ? title + ' was on target in the latest completed recorded period.'
      : title + ' was off target in the latest completed recorded period.';
  }

  private buildSupportingGoalPeriods(
    events: SupportEventRow[],
    relation: ConnectedSupportingGoal,
    timezone: string,
  ): SupportingGoalPeriod[] {
    const byKey = new Map<string, SupportEventRow[]>();

    for (const event of events) {
      const day = dayKey(event.occurredAt, timezone);
      if (!day) continue;

      const key =
        String(relation.frequency).toUpperCase() === 'WEEKLY'
          ? weekStartDay(day)
          : day;

      const current = byKey.get(key) ?? [];
      current.push(event);
      byKey.set(key, current);
    }

    return [...byKey.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, periodEvents]) => {
        const value = aggregateSupportingGoalEvents(
          periodEvents,
          relation.aggregation,
        );

        const startDay = key;
        const endDay =
          String(relation.frequency).toUpperCase() === 'WEEKLY'
            ? addDays(startDay, 6)
            : startDay;

        return {
          key,
          startDay,
          endDay,
          label:
            String(relation.frequency).toUpperCase() === 'WEEKLY'
              ? 'week of ' + startDay
              : startDay,
          value,
          status: compareSupportingGoalToTarget(value, relation),
          days: enumerateDays(startDay, endDay),
        };
      });
  }
}

function aggregateSupportingGoalEvents(
  events: SupportEventRow[],
  aggregation: string,
): number {
  const values = events
    .map((event) => Number(event.loggedValue))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return Number.NaN;

  switch (String(aggregation).toUpperCase()) {
    case 'AVERAGE':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'MIN':
      return Math.min(...values);
    case 'MAX':
      return Math.max(...values);
    case 'LATEST':
      return values[values.length - 1];
    case 'SUM':
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function compareSupportingGoalToTarget(
  value: number,
  relation: ConnectedSupportingGoal,
): MedicationComparisonStatus {
  const target =
    relation.frequencyTarget == null ? null : Number(relation.frequencyTarget);

  if (target == null || !Number.isFinite(target) || !Number.isFinite(value)) {
    return 'INSUFFICIENT_DATA';
  }

  const comparison = String(relation.comparison).toUpperCase();

  if (comparison === 'AT_MOST' || comparison === 'DECREASE_TO') {
    return value <= target ? 'ON_TARGET' : 'ABOVE_TARGET';
  }

  if (comparison === 'CLOSEST') {
    const tolerance = Math.max(Math.abs(target) * 0.1, 0.1);
    return Math.abs(value - target) <= tolerance
      ? 'ON_TARGET'
      : value < target
        ? 'BELOW_TARGET'
        : 'ABOVE_TARGET';
  }

  return value >= target ? 'ON_TARGET' : 'BELOW_TARGET';
}

function metricUnit(metricKey: string): string {
  switch (String(metricKey).toLowerCase()) {
    case 'nutrition.calories':
      return 'kcal/day';
    case 'exercise.minutes':
      return 'min/week';
    case 'sleep.hours':
      return 'hours/night';
    case 'hydration.ml':
      return 'ml/day';
    default:
      return '';
  }
}

function dayKey(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function weekStartDay(day: string): string {
  const date = new Date(day + 'T12:00:00Z');
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (weekday - 1));
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  for (let guard = 0; guard < 370; guard += 1) {
    days.push(cursor);
    if (cursor === end) break;
    cursor = addDays(cursor, 1);
  }
  return days;
}