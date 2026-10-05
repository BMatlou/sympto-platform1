import { Injectable } from '@nestjs/common';
import type {
  MedicationDayBucket,
  MedicationSchedule,
} from './medication-insight.service';

export type ClinicalMedicationAction = 'TAKEN' | 'SKIPPED';

export type ClinicalTimeBucket = 'MORNING' | 'AFTERNOON' | 'EVENING_NIGHT';

export interface ClinicalMedicationGoal {
  medicationId: string | null;
  name: string;
  frequency: number;
  startDate: Date;
  targetDate: Date | null;
  targetAdherence: number;
}

export interface ClinicalMedicationEvent {
  timestamp: Date;
  action: ClinicalMedicationAction;
}

export interface ClinicalSupportingGoal {
  goalId: string;
  name: string;
  category: string;
  unit: string | null;
  targetValue: number | null;
  frequency: string;
  metricType: string;
  metricKey: string;
  aggregation: string;
  comparison: string;
  createdAt: Date;
}

export interface ClinicalJournalEvent {
  goalId: string;
  timestamp: Date;
  value: number;
  source: string;
}

export interface ClinicalIntelligenceRules {
  interferenceFailureRate: number;
  behavioralDeltaPercentagePoints: number;
  minimumComparisonDaysPerGroup: number;
  minimumExpectedDosesForInterference: number;
}

export interface MedicationClinicalIntelligenceInput {
  medicationGoal: ClinicalMedicationGoal;
  medicationEvents: ClinicalMedicationEvent[];
  supportingGoals: ClinicalSupportingGoal[];
  journalEvents: ClinicalJournalEvent[];
  medicationSchedule: MedicationSchedule;
  scheduledDays: MedicationDayBucket[];
  now: Date;
  timezone: string;
  rules?: Partial<ClinicalIntelligenceRules>;
}

export interface TrajectoryAnalysis {
  elapsedLifecycleDays: number;
  lifetimeDays: number;
  dailyFrequency: number;
  expectedDosesToDate: number;
  lifetimeExpectedDoses: number;
  takenDoses: number;
  adherencePercent: number;
  targetAdherencePercent: number;
  variancePercentagePoints: number;
  varianceType: 'ABOVE_TARGET' | 'ON_TARGET' | 'BELOW_TARGET';
  remainingDosesNeededForTarget: number | null;
  remainingScheduledDoses: number | null;
  targetReachable: boolean | null;
}

export interface TimeBucketAnalysis {
  bucket: ClinicalTimeBucket;
  label: string;
  expectedDoses: number;
  takenDoses: number;
  skippedDoses: number;
  unloggedDoses: number;
  failureCount: number;
  failureRatePercent: number | null;
}

export interface ChronologicalInterference {
  bucket: ClinicalTimeBucket;
  label: string;
  failureRatePercent: number;
  failedDoses: number;
  expectedDoses: number;
  statement: string;
}

export interface CrossGoalAssociation {
  goalId: string;
  goalName: string;
  goalCategory: string;
  loggedDays: number;
  nonLoggedDays: number;
  scheduledDosesOnLoggedDays: number;
  takenDosesOnLoggedDays: number;
  adherenceOnLoggedDays: number | null;
  scheduledDosesOnNonLoggedDays: number;
  takenDosesOnNonLoggedDays: number;
  adherenceOnNonLoggedDays: number | null;
  deltaPercentagePoints: number | null;
  meaningful: boolean;
  direction: 'HIGHER_WITH_LOGGED_DAYS' | 'LOWER_WITH_LOGGED_DAYS' | 'NO_MEASURABLE_DIFFERENCE' | 'INSUFFICIENT_DATA';
  latestJournalValue: number | null;
  latestJournalDate: string | null;
  unit: string | null;
  statement: string | null;
}

export interface BehavioralCluster {
  direction: 'HIGHER_WITH_LOGGED_DAYS' | 'LOWER_WITH_LOGGED_DAYS';
  goalNames: string[];
  averageDeltaPercentagePoints: number;
  statement: string;
}

export interface ClinicalNarrativeRoutineAnchor {
  goalId: string;
  goalName: string;
  goalCategory: string;
  timeBucket: ClinicalTimeBucket;
  timeLabel: string;
  loggedDays: number;
  nonLoggedDays: number;
  loggedWindowAdherencePercent: number;
  nonLoggedWindowAdherencePercent: number;
  deltaPercentagePoints: number;
  latestJournalValue: number | null;
  latestJournalDate: string | null;
  unit: string | null;
  statement: string;
  actionStatement: string;
}

export interface ClinicalNarrative {
  baseline: {
    takenDoses: number;
    expectedDoses: number;
    adherencePercent: number;
    targetAdherencePercent: number;
    variancePercentagePoints: number;
    status: 'BELOW_TARGET' | 'ON_TARGET' | 'ABOVE_TARGET';
  };
  today: {
    takenDoses: number;
    expectedDoses: number;
    adherencePercent: number;
    isComplete: boolean;
  };
  interference: {
    bucket: ClinicalTimeBucket;
    label: string;
    failureRatePercent: number;
    failedDoses: number;
    expectedDoses: number;
    consistencyRatePercent: number;
    comparison: Array<{
      label: string;
      consistencyRatePercent: number;
      expectedDoses: number;
      failureDoses: number;
      available: boolean;
    }>;
  } | null;
  routineAnchor: ClinicalNarrativeRoutineAnchor | null;
  statisticalAssociationNote: string;
}

export interface ClinicalIntelligenceOutput {
  trajectory: TrajectoryAnalysis;
  timeBuckets: TimeBucketAnalysis[];
  chronologicalInterference: ChronologicalInterference | null;
  crossGoalAssociations: CrossGoalAssociation[];
  behavioralClusters: BehavioralCluster[];
  headline: string | null;
  clinicalNarrative: ClinicalNarrative;
  secondaryInsights: string[];
  dataCoverage: {
    medicationEvents: number;
    scheduledDays: number;
    supportingGoals: number;
    journalEvents: number;
  };
}

const DEFAULT_RULES: ClinicalIntelligenceRules = {
  interferenceFailureRate: 50,
  behavioralDeltaPercentagePoints: 15,
  minimumComparisonDaysPerGroup: 3,
  minimumExpectedDosesForInterference: 3,
};

const TEMPLATE_LIBRARY = {
  trajectoryBelow:
    '⚠️ {varianceType}: {takenDoses} of {expectedDosesToDate} lifecycle doses are currently represented ({adherencePercent}%). The trajectory is {varianceAbs}% below the {targetAdherencePercent}% target.',
  trajectoryOn:
    'Your medication goal is currently at {adherencePercent}% adherence, meeting the {targetAdherencePercent}% target.',
  trajectoryAbove:
    'Your medication goal is currently at {adherencePercent}% adherence, {varianceAbs} percentage points above the {targetAdherencePercent}% target.',
  interference:
    'Chronological interference: the {timeBucket} dose window has a {failureRatePercent}% failure rate ({failedDoses} of {expectedDoses} expected doses not taken).',
  associationHigher:
    '{goalName}: medication adherence was {deltaAbs}% higher on days with a recorded goal entry ({loggedAdherencePercent}% vs {nonLoggedAdherencePercent}%).',
  associationLower:
    '{goalName}: medication adherence was {deltaAbs}% lower on days with a recorded goal entry ({loggedAdherencePercent}% vs {nonLoggedAdherencePercent}%).',
  clusterHigher:
    'Cross-goal cluster: medication adherence was higher on days with recorded entries for {goalNames} (average difference {averageDelta}% points).',
  clusterLower:
    'Cross-goal cluster: medication adherence was lower on days with recorded entries for {goalNames} (average difference {averageDelta}% points).',
} as const;

@Injectable()
export class MedicationClinicalIntelligenceEngine {
  calculate(input: MedicationClinicalIntelligenceInput): ClinicalIntelligenceOutput {
    const rules = {
      ...DEFAULT_RULES,
      ...(input.rules ?? {}),
    };

    const trajectory = calculateTrajectory(input);
    const timeBuckets = calculateTimeBuckets(input);
    const chronologicalInterference = identifyChronologicalInterference(timeBuckets, rules);

    const crossGoalAssociations = input.supportingGoals.map((goal) =>
      calculateCrossGoalAssociation(input, goal, rules),
    );

    const behavioralClusters = calculateBehavioralClusters(crossGoalAssociations);
    const clinicalNarrative = buildClinicalNarrative(
      input,
      trajectory,
      timeBuckets,
      chronologicalInterference,
      rules,
    );

    const headline = buildHeadline(trajectory, chronologicalInterference, behavioralClusters);
    const secondaryInsights = [
      chronologicalInterference?.statement,
      ...crossGoalAssociations
        .filter((association) => association.meaningful && association.statement)
        .map((association) => association.statement as string),
      ...behavioralClusters.map((cluster) => cluster.statement),
    ].filter(Boolean) as string[];

    return {
      trajectory,
      timeBuckets,
      chronologicalInterference,
      crossGoalAssociations,
      behavioralClusters,
      clinicalNarrative,
      headline,
      secondaryInsights: uniqueStrings(secondaryInsights),
      dataCoverage: {
        medicationEvents: input.medicationEvents.length,
        scheduledDays: input.scheduledDays.length,
        supportingGoals: input.supportingGoals.length,
        journalEvents: input.journalEvents.length,
      },
    };
  }
}

function calculateTrajectory(
  input: MedicationClinicalIntelligenceInput,
): TrajectoryAnalysis {
  const start = dateKey(input.medicationGoal.startDate, input.timezone);
  const today = dateKey(input.now, input.timezone);
  const targetDay = input.medicationGoal.targetDate
    ? dateKey(input.medicationGoal.targetDate, input.timezone)
    : today;
  const elapsedEnd = targetDay < today ? targetDay : today;

  const elapsedLifecycleDays = Math.max(
    1,
    inclusiveDayCount(start, elapsedEnd),
  );
  const lifetimeDays = Math.max(
    elapsedLifecycleDays,
    inclusiveDayCount(start, targetDay),
  );

  const dailyFrequency = Math.max(
    1,
    Number(input.medicationGoal.frequency) || Number(input.medicationSchedule.dosesPerDay) || 1,
  );

  const expectedDosesToDate = elapsedLifecycleDays * dailyFrequency;
  const lifetimeExpectedDoses = lifetimeDays * dailyFrequency;
  const lifecycleEnd = input.medicationGoal.targetDate
    ? input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now
    : input.now;

  const takenDoses = input.medicationEvents.filter(
    (event) =>
      event.action === 'TAKEN' &&
      event.timestamp >= input.medicationGoal.startDate &&
      event.timestamp <= lifecycleEnd,
  ).length;

  const adherencePercent =
    expectedDosesToDate > 0
      ? round((takenDoses / expectedDosesToDate) * 100)
      : 0;

  const targetAdherencePercent = normalizeTarget(input.medicationGoal.targetAdherence);
  const variancePercentagePoints = round(
    adherencePercent - targetAdherencePercent,
  );

  const remainingDosesNeededForTarget =
    variancePercentagePoints < 0
      ? Math.max(
          0,
          Math.ceil((lifetimeExpectedDoses * targetAdherencePercent) / 100) -
            takenDoses,
        )
      : 0;

  const remainingScheduledDoses = input.medicationGoal.targetDate
    ? Math.max(0, lifetimeExpectedDoses - expectedDosesToDate)
    : null;

  const targetReachable =
    remainingScheduledDoses == null
      ? null
      : takenDoses + remainingScheduledDoses >=
        Math.ceil((lifetimeExpectedDoses * targetAdherencePercent) / 100);

  return {
    elapsedLifecycleDays,
    lifetimeDays,
    dailyFrequency,
    expectedDosesToDate,
    lifetimeExpectedDoses,
    takenDoses,
    adherencePercent,
    targetAdherencePercent,
    variancePercentagePoints,
    varianceType:
      variancePercentagePoints < 0
        ? 'BELOW_TARGET'
        : variancePercentagePoints > 0
          ? 'ABOVE_TARGET'
          : 'ON_TARGET',
    remainingDosesNeededForTarget,
    remainingScheduledDoses,
    targetReachable,
  };
}

function calculateTimeBuckets(
  input: MedicationClinicalIntelligenceInput,
): TimeBucketAnalysis[] {
  const bucketDefinitions: Array<{
    bucket: ClinicalTimeBucket;
    label: string;
    startMinutes: number;
    endMinutes: number;
  }> = [
    { bucket: 'MORNING', label: 'Morning', startMinutes: 5 * 60, endMinutes: 12 * 60 },
    { bucket: 'AFTERNOON', label: 'Afternoon', startMinutes: 12 * 60, endMinutes: 17 * 60 },
    { bucket: 'EVENING_NIGHT', label: 'Evening/Night', startMinutes: 17 * 60, endMinutes: 29 * 60 },
  ];

  const expected = new Map<ClinicalTimeBucket, number>();
  const taken = new Map<ClinicalTimeBucket, number>();
  const skipped = new Map<ClinicalTimeBucket, number>();

  for (const definition of bucketDefinitions) {
    expected.set(definition.bucket, 0);
    taken.set(definition.bucket, 0);
    skipped.set(definition.bucket, 0);
  }

  const timingSlots = resolveTimingSlots(input);

  for (const day of input.scheduledDays.filter((candidate) => candidate.expectedDoses > 0)) {
    if (!scheduleDayIsActive(input.medicationSchedule, day.day, input.timezone)) continue;

    for (const slotMinutes of timingSlots) {
      const definition = bucketDefinitions.find((candidate) =>
        isMinuteInBucket(slotMinutes, candidate.startMinutes, candidate.endMinutes),
      );
      if (!definition) continue;

      if (day.day === dateKey(input.now, input.timezone)) {
        const currentMinutes = timeToMinutes(localTime(input.now, input.timezone));
        if (slotMinutes > currentMinutes) continue;
      }

      expected.set(
        definition.bucket,
        (expected.get(definition.bucket) ?? 0) + 1,
      );
    }
  }

  const lifecycleEnd = input.medicationGoal.targetDate
    ? input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now
    : input.now;

  for (const event of input.medicationEvents) {
    if (
      event.timestamp < input.medicationGoal.startDate ||
      event.timestamp > lifecycleEnd
    ) {
      continue;
    }

    const bucket = bucketForTimestamp(event.timestamp, input.timezone);
    if (!bucket) continue;

    if (event.action === 'TAKEN') {
      taken.set(bucket, (taken.get(bucket) ?? 0) + 1);
    } else {
      skipped.set(bucket, (skipped.get(bucket) ?? 0) + 1);
    }
  }

  return bucketDefinitions.map((definition) => {
    const expectedDoses = expected.get(definition.bucket) ?? 0;
    const takenDoses = Math.min(expectedDoses, taken.get(definition.bucket) ?? 0);
    const skippedDoses = Math.min(
      Math.max(0, expectedDoses - takenDoses),
      skipped.get(definition.bucket) ?? 0,
    );
    const unloggedDoses = Math.max(
      0,
      expectedDoses - takenDoses - skippedDoses,
    );
    const failureCount = skippedDoses + unloggedDoses;
    const failureRatePercent =
      expectedDoses > 0 ? round((failureCount / expectedDoses) * 100) : null;

    return {
      bucket: definition.bucket,
      label: definition.label,
      expectedDoses,
      takenDoses,
      skippedDoses,
      unloggedDoses,
      failureCount,
      failureRatePercent,
    };
  });
}

function identifyChronologicalInterference(
  buckets: TimeBucketAnalysis[],
  rules: ClinicalIntelligenceRules,
): ChronologicalInterference | null {
  const candidates = buckets
    .filter(
      (bucket) =>
        bucket.failureRatePercent != null &&
        bucket.expectedDoses >= rules.minimumExpectedDosesForInterference &&
        bucket.failureRatePercent >= rules.interferenceFailureRate,
    )
    .sort((a, b) => {
      const failureDelta =
        Number(b.failureRatePercent ?? -1) - Number(a.failureRatePercent ?? -1);
      if (failureDelta !== 0) return failureDelta;
      return b.failureCount - a.failureCount;
    });

  const strongest = candidates[0];
  if (!strongest || strongest.failureRatePercent == null) return null;

  return {
    bucket: strongest.bucket,
    label: strongest.label,
    failureRatePercent: strongest.failureRatePercent,
    failedDoses: strongest.failureCount,
    expectedDoses: strongest.expectedDoses,
    statement: renderTemplate(TEMPLATE_LIBRARY.interference, {
      timeBucket: strongest.label,
      failureRatePercent: strongest.failureRatePercent,
      failedDoses: strongest.failureCount,
      expectedDoses: strongest.expectedDoses,
    }),
  };
}

function calculateCrossGoalAssociation(
  input: MedicationClinicalIntelligenceInput,
  goal: ClinicalSupportingGoal,
  rules: ClinicalIntelligenceRules,
): CrossGoalAssociation {
  const lifecycleEnd = input.medicationGoal.targetDate
    ? input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now
    : input.now;

  const goalEvents = input.journalEvents
    .filter(
      (event) =>
        event.goalId === goal.goalId &&
        event.timestamp >= input.medicationGoal.startDate &&
        event.timestamp <= lifecycleEnd,
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const loggedDates = new Set(
    goalEvents.map((event) => dateKey(event.timestamp, input.timezone)),
  );

  const medicationByDay = aggregateMedicationByDay(
    input,
    input.timezone,
  );

  const comparisonStartDay = dateKey(
    goal.createdAt > input.medicationGoal.startDate
      ? goal.createdAt
      : input.medicationGoal.startDate,
    input.timezone,
  );

  const eligibleComparisonDays = medicationByDay.filter(
    (day) => day.day >= comparisonStartDay,
  );

  const loggedDays = eligibleComparisonDays.filter((day) => loggedDates.has(day.day));
  const nonLoggedDays = eligibleComparisonDays.filter((day) => !loggedDates.has(day.day));

  const loggedScheduled = sum(loggedDays.map((day) => day.expected));
  const loggedTaken = sum(loggedDays.map((day) => day.taken));
  const nonLoggedScheduled = sum(nonLoggedDays.map((day) => day.expected));
  const nonLoggedTaken = sum(nonLoggedDays.map((day) => day.taken));

  const adherenceOnLoggedDays =
    loggedScheduled > 0 ? round((loggedTaken / loggedScheduled) * 100) : null;
  const adherenceOnNonLoggedDays =
    nonLoggedScheduled > 0
      ? round((nonLoggedTaken / nonLoggedScheduled) * 100)
      : null;

  const deltaPercentagePoints =
    adherenceOnLoggedDays == null || adherenceOnNonLoggedDays == null
      ? null
      : round(adherenceOnLoggedDays - adherenceOnNonLoggedDays);

  const meaningful =
    deltaPercentagePoints != null &&
    Math.abs(deltaPercentagePoints) >= rules.behavioralDeltaPercentagePoints &&
    loggedDays.length >= rules.minimumComparisonDaysPerGroup &&
    nonLoggedDays.length >= rules.minimumComparisonDaysPerGroup &&
    loggedScheduled > 0 &&
    nonLoggedScheduled > 0;

  const latest = goalEvents.at(-1);
  const direction =
    deltaPercentagePoints == null ||
    Math.abs(deltaPercentagePoints) < rules.behavioralDeltaPercentagePoints
      ? deltaPercentagePoints == null
        ? 'INSUFFICIENT_DATA'
        : 'NO_MEASURABLE_DIFFERENCE'
      : deltaPercentagePoints > 0
        ? 'HIGHER_WITH_LOGGED_DAYS'
        : 'LOWER_WITH_LOGGED_DAYS';

  const latestJournalDate = latest
    ? dateKey(latest.timestamp, input.timezone)
    : null;

  let statement: string | null = null;
  if (meaningful && deltaPercentagePoints != null && adherenceOnLoggedDays != null && adherenceOnNonLoggedDays != null) {
    const template =
      deltaPercentagePoints > 0
        ? TEMPLATE_LIBRARY.associationHigher
        : TEMPLATE_LIBRARY.associationLower;

    statement = renderTemplate(template, {
      goalName: goal.name,
      deltaAbs: Math.abs(deltaPercentagePoints),
      loggedAdherencePercent: adherenceOnLoggedDays,
      nonLoggedAdherencePercent: adherenceOnNonLoggedDays,
    });
  }

  return {
    goalId: goal.goalId,
    goalName: goal.name,
    goalCategory: goal.category,
    loggedDays: loggedDays.length,
    nonLoggedDays: nonLoggedDays.length,
    scheduledDosesOnLoggedDays: loggedScheduled,
    takenDosesOnLoggedDays: loggedTaken,
    adherenceOnLoggedDays,
    scheduledDosesOnNonLoggedDays: nonLoggedScheduled,
    takenDosesOnNonLoggedDays: nonLoggedTaken,
    adherenceOnNonLoggedDays,
    deltaPercentagePoints,
    meaningful,
    direction,
    latestJournalValue: latest ? Number(latest.value) : null,
    latestJournalDate,
    unit: goal.unit,
    statement,
  };
}

function calculateBehavioralClusters(
  associations: CrossGoalAssociation[],
): BehavioralCluster[] {
  const meaningful = associations.filter(
    (association) => association.meaningful && association.deltaPercentagePoints != null,
  );

  const positive = meaningful.filter(
    (association) => Number(association.deltaPercentagePoints) > 0,
  );
  const negative = meaningful.filter(
    (association) => Number(association.deltaPercentagePoints) < 0,
  );

  const clusters: BehavioralCluster[] = [];

  for (const group of [positive, negative]) {
    if (group.length < 2) continue;

    const averageDelta =
      group.reduce(
        (sumValue, association) =>
          sumValue + Math.abs(Number(association.deltaPercentagePoints)),
        0,
      ) / group.length;

    clusters.push({
      direction:
        group === positive
          ? 'HIGHER_WITH_LOGGED_DAYS'
          : 'LOWER_WITH_LOGGED_DAYS',
      goalNames: group.map((association) => association.goalName),
      averageDeltaPercentagePoints: round(averageDelta),
      statement: renderTemplate(
        group === positive
          ? TEMPLATE_LIBRARY.clusterHigher
          : TEMPLATE_LIBRARY.clusterLower,
        {
          goalNames: joinNames(group.map((association) => association.goalName)),
          averageDelta: round(averageDelta),
        },
      ),
    });
  }

  return clusters;
}

function buildClinicalNarrative(
  input: MedicationClinicalIntelligenceInput,
  trajectory: TrajectoryAnalysis,
  timeBuckets: TimeBucketAnalysis[],
  chronologicalInterference: ChronologicalInterference | null,
  rules: ClinicalIntelligenceRules,
): ClinicalNarrative {
  const todayDay = dateKey(input.now, input.timezone);
  const todayBucket = input.scheduledDays.find((day) => day.day === todayDay);
  const todayExpected = Math.max(0, Number(todayBucket?.expectedDoses ?? 0));
  const todayTaken = Math.min(
    todayExpected,
    Math.max(0, Number(todayBucket?.takenDoses ?? 0)),
  );
  const todayAdherence =
    todayExpected > 0 ? round((todayTaken / todayExpected) * 100) : 0;

  const routineAnchor = chronologicalInterference
    ? findRoutineAnchor(input, chronologicalInterference.bucket, rules)
    : null;

  const interference = chronologicalInterference
    ? {
        bucket: chronologicalInterference.bucket,
        label: chronologicalInterference.label,
        failureRatePercent: chronologicalInterference.failureRatePercent,
        failedDoses: chronologicalInterference.failedDoses,
        expectedDoses: chronologicalInterference.expectedDoses,
        consistencyRatePercent: round(
          100 - chronologicalInterference.failureRatePercent,
        ),
        comparison: timeBuckets
          .filter((bucket) => bucket.expectedDoses > 0)
          .map((bucket) => ({
            label: bucket.label,
            consistencyRatePercent: round(
              100 - Number(bucket.failureRatePercent ?? 100),
            ),
            expectedDoses: bucket.expectedDoses,
            failureDoses: bucket.failureCount,
            available: bucket.expectedDoses > 0,
          })),
      }
    : null;

  return {
    baseline: {
      takenDoses: trajectory.takenDoses,
      expectedDoses: trajectory.expectedDosesToDate,
      adherencePercent: trajectory.adherencePercent,
      targetAdherencePercent: trajectory.targetAdherencePercent,
      variancePercentagePoints: trajectory.variancePercentagePoints,
      status: trajectory.varianceType,
    },
    today: {
      takenDoses: todayTaken,
      expectedDoses: todayExpected,
      adherencePercent: todayAdherence,
      isComplete: todayExpected > 0 && todayTaken >= todayExpected,
    },
    interference,
    routineAnchor,
    statisticalAssociationNote:
      'Statistical Association: Identifies correlations across your logged data streams. Does not imply direct clinical causation.',
  };
}

function findRoutineAnchor(
  input: MedicationClinicalIntelligenceInput,
  timeBucket: ClinicalTimeBucket,
  rules: ClinicalIntelligenceRules,
): ClinicalNarrativeRoutineAnchor | null {
  const dailyWindow = aggregateTimeBucketByDay(input, timeBucket);
  const today = dateKey(input.now, input.timezone);
  const associations: ClinicalNarrativeRoutineAnchor[] = [];

  for (const goal of input.supportingGoals) {
    const goalEvents = input.journalEvents
      .filter(
        (event) =>
          event.goalId === goal.goalId &&
          event.timestamp >= input.medicationGoal.startDate &&
          event.timestamp <=
            (input.medicationGoal.targetDate &&
            input.medicationGoal.targetDate < input.now
              ? input.medicationGoal.targetDate
              : input.now),
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const loggedDates = new Set(
      goalEvents.map((event) => dateKey(event.timestamp, input.timezone)),
    );

    const comparisonStartDay = dateKey(
      goal.createdAt > input.medicationGoal.startDate
        ? goal.createdAt
        : input.medicationGoal.startDate,
      input.timezone,
    );

    const eligibleDays = dailyWindow.filter(
      (day) =>
        day.day >= comparisonStartDay &&
        day.day < today &&
        day.expectedDoses > 0,
    );

    const loggedDays = eligibleDays.filter((day) => loggedDates.has(day.day));
    const nonLoggedDays = eligibleDays.filter((day) => !loggedDates.has(day.day));

    const loggedExpected = sum(loggedDays.map((day) => day.expectedDoses));
    const loggedTaken = sum(loggedDays.map((day) => day.takenDoses));
    const nonLoggedExpected = sum(
      nonLoggedDays.map((day) => day.expectedDoses),
    );
    const nonLoggedTaken = sum(nonLoggedDays.map((day) => day.takenDoses));

    const loggedAdherence =
      loggedExpected > 0 ? round((loggedTaken / loggedExpected) * 100) : null;
    const nonLoggedAdherence =
      nonLoggedExpected > 0
        ? round((nonLoggedTaken / nonLoggedExpected) * 100)
        : null;

    if (
      loggedAdherence == null ||
      nonLoggedAdherence == null ||
      loggedDays.length < rules.minimumComparisonDaysPerGroup ||
      nonLoggedDays.length < rules.minimumComparisonDaysPerGroup
    ) {
      continue;
    }

    const delta = round(loggedAdherence - nonLoggedAdherence);
    if (delta < rules.behavioralDeltaPercentagePoints) continue;

    const latest = goalEvents.at(-1);

    const timeLabel =
      timeBucket === 'MORNING'
        ? 'morning'
        : timeBucket === 'AFTERNOON'
          ? 'afternoon'
          : 'evening/night';

    const observation = latest
      ? ' Latest linked observation: ' +
        round(Number(latest.value)) +
        (goal.unit ? ' ' + goal.unit : '') +
        ' on ' +
        dateKey(latest.timestamp, input.timezone) +
        '.'
      : '';

    associations.push({
      goalId: goal.goalId,
      goalName: goal.name,
      goalCategory: goal.category,
      timeBucket,
      timeLabel,
      loggedDays: loggedDays.length,
      nonLoggedDays: nonLoggedDays.length,
      loggedWindowAdherencePercent: loggedAdherence,
      nonLoggedWindowAdherencePercent: nonLoggedAdherence,
      deltaPercentagePoints: delta,
      latestJournalValue: latest ? Number(latest.value) : null,
      latestJournalDate: latest
        ? dateKey(latest.timestamp, input.timezone)
        : null,
      unit: goal.unit,
      statement:
        'Cross-goal mapping indicates a measurable association with ' +
        goal.name +
        ': on ' +
        loggedDays.length +
        ' days with a recorded ' +
        goal.name +
        ' observation, ' +
        timeLabel +
        ' adherence was ' +
        loggedAdherence +
        '% versus ' +
        nonLoggedAdherence +
        '% across ' +
        nonLoggedDays.length +
        ' days without the observation (' +
        delta +
        ' percentage points higher).' +
        observation,
      actionStatement:
        'Insight: Your tracking vulnerability clusters around ' +
        timeLabel +
        ' wind-downs. Consider anchoring the ' +
        input.medicationGoal.name +
        ' ' +
        timeLabel +
        ' dose to your high-consistency ' +
        goal.name +
        ' check-in; this may reduce tracking friction.',
    });
  }

  associations.sort((a, b) => {
    if (b.deltaPercentagePoints !== a.deltaPercentagePoints) {
      return b.deltaPercentagePoints - a.deltaPercentagePoints;
    }
    if (b.loggedDays !== a.loggedDays) return b.loggedDays - a.loggedDays;
    return a.goalName.localeCompare(b.goalName);
  });

  return associations[0] ?? null;
}

function aggregateTimeBucketByDay(
  input: MedicationClinicalIntelligenceInput,
  bucket: ClinicalTimeBucket,
): Array<{
  day: string;
  expectedDoses: number;
  takenDoses: number;
}> {
  const definitions: Record<
    ClinicalTimeBucket,
    { start: number; end: number }
  > = {
    MORNING: { start: 5 * 60, end: 12 * 60 },
    AFTERNOON: { start: 12 * 60, end: 17 * 60 },
    EVENING_NIGHT: { start: 17 * 60, end: 29 * 60 },
  };

  const definition = definitions[bucket];
  const today = dateKey(input.now, input.timezone);
  const lifecycleEndDay = dateKey(
    input.medicationGoal.targetDate &&
      input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now,
    input.timezone,
  );

  const expectedByDay = new Map<string, number>();
  const takenByDay = new Map<string, number>();
  const timingSlots = resolveTimingSlots(input);

  for (const day of input.scheduledDays) {
    if (
      day.day > lifecycleEndDay ||
      day.expectedDoses <= 0 ||
      !scheduleDayIsActive(input.medicationSchedule, day.day, input.timezone)
    ) {
      continue;
    }

    let bucketExpected = 0;
    for (const slotMinutes of timingSlots) {
      if (isMinuteInBucket(slotMinutes, definition.start, definition.end)) {
        if (day.day === today) {
          const nowMinutes = timeToMinutes(localTime(input.now, input.timezone));
          if (slotMinutes > nowMinutes) continue;
        }
        bucketExpected += 1;
      }
    }

    if (bucketExpected > 0) expectedByDay.set(day.day, bucketExpected);
  }

  for (const event of input.medicationEvents) {
    if (
      event.action !== 'TAKEN' ||
      event.timestamp < input.medicationGoal.startDate ||
      event.timestamp > input.now
    ) {
      continue;
    }

    if (bucketForTimestamp(event.timestamp, input.timezone) !== bucket) {
      continue;
    }

    const day = dateKey(event.timestamp, input.timezone);
    if (day > lifecycleEndDay) continue;
    takenByDay.set(day, (takenByDay.get(day) ?? 0) + 1);
  }

  return [...expectedByDay.keys()]
    .sort()
    .map((day) => ({
      day,
      expectedDoses: expectedByDay.get(day) ?? 0,
      takenDoses: Math.min(
        expectedByDay.get(day) ?? 0,
        takenByDay.get(day) ?? 0,
      ),
    }));
}

function resolveTimingSlots(
  input: MedicationClinicalIntelligenceInput,
): number[] {
  const configured = input.medicationSchedule.reminderSlots
    .map(timeToMinutes)
    .filter(Number.isFinite);

  if (configured.length > 0) {
    return configured;
  }

  const lifecycleEnd =
    input.medicationGoal.targetDate && input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now;

  const observations = input.medicationEvents
    .filter(
      (event) =>
        event.timestamp >= input.medicationGoal.startDate &&
        event.timestamp <= lifecycleEnd,
    )
    .map((event) => timeToMinutes(localTime(event.timestamp, input.timezone)))
    .filter(Number.isFinite);

  const k = Math.max(
    1,
    Math.min(
      Math.round(
        Number(input.medicationGoal.frequency) ||
          input.medicationSchedule.dosesPerDay ||
          1,
      ),
      4,
    ),
  );

  if (observations.length < Math.max(6, k * 2)) {
    return [];
  }

  return circularKMeans(observations, k);
}

function circularKMeans(values: number[], k: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const centers = Array.from({ length: k }, (_, index) => {
    const position = ((index + 0.5) / k) * sorted.length;
    return sorted[Math.min(sorted.length - 1, Math.floor(position))];
  });

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const groups = Array.from({ length: k }, () => [] as number[]);

    for (const value of values) {
      let nearest = 0;
      let nearestDistance = circularMinuteDistance(value, centers[0]);

      for (let index = 1; index < centers.length; index += 1) {
        const distance = circularMinuteDistance(value, centers[index]);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      }

      groups[nearest].push(value);
    }

    let changed = false;

    for (let index = 0; index < groups.length; index += 1) {
      if (!groups[index].length) continue;
      const nextCenter = circularMean(groups[index]);
      if (circularMinuteDistance(nextCenter, centers[index]) > 1) {
        changed = true;
        centers[index] = nextCenter;
      }
    }

    if (!changed) break;
  }

  return centers
    .map((value) => ((Math.round(value) % 1440) + 1440) % 1440)
    .sort((a, b) => a - b);
}

function circularMinuteDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1440 - distance);
}

function circularMean(values: number[]): number {
  let sinSum = 0;
  let cosSum = 0;

  for (const value of values) {
    const radians = (value / 1440) * 2 * Math.PI;
    sinSum += Math.sin(radians);
    cosSum += Math.cos(radians);
  }

  let radians = Math.atan2(
    sinSum / values.length,
    cosSum / values.length,
  );

  if (radians < 0) radians += 2 * Math.PI;

  return (radians / (2 * Math.PI)) * 1440;
}

function buildHeadline(
  trajectory: TrajectoryAnalysis,
  chronologicalInterference: ChronologicalInterference | null,
  clusters: BehavioralCluster[],
): string | null {
  if (chronologicalInterference) return chronologicalInterference.statement;
  if (clusters.length) return clusters[0].statement;

  if (trajectory.varianceType === 'BELOW_TARGET') {
    return renderTemplate(TEMPLATE_LIBRARY.trajectoryBelow, {
      varianceType: 'BELOW_TARGET',
      takenDoses: trajectory.takenDoses,
      expectedDosesToDate: trajectory.expectedDosesToDate,
      adherencePercent: trajectory.adherencePercent,
      varianceAbs: Math.abs(trajectory.variancePercentagePoints),
      targetAdherencePercent: trajectory.targetAdherencePercent,
    });
  }

  if (trajectory.varianceType === 'ABOVE_TARGET') {
    return renderTemplate(TEMPLATE_LIBRARY.trajectoryAbove, {
      adherencePercent: trajectory.adherencePercent,
      varianceAbs: Math.abs(trajectory.variancePercentagePoints),
      targetAdherencePercent: trajectory.targetAdherencePercent,
    });
  }

  return renderTemplate(TEMPLATE_LIBRARY.trajectoryOn, {
    adherencePercent: trajectory.adherencePercent,
    targetAdherencePercent: trajectory.targetAdherencePercent,
  });
}

function aggregateMedicationByDay(
  input: MedicationClinicalIntelligenceInput,
  timezone: string,
): Array<{ day: string; expected: number; taken: number }> {
  const takenByDay = new Map<string, number>();

  const lifecycleEnd = input.medicationGoal.targetDate
    ? input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now
    : input.now;

  for (const event of input.medicationEvents) {
    if (
      event.action !== 'TAKEN' ||
      event.timestamp < input.medicationGoal.startDate ||
      event.timestamp > lifecycleEnd
    ) {
      continue;
    }
    const day = dateKey(event.timestamp, timezone);
    takenByDay.set(day, (takenByDay.get(day) ?? 0) + 1);
  }

  const lifecycleEndDay = dateKey(
    input.medicationGoal.targetDate && input.medicationGoal.targetDate < input.now
      ? input.medicationGoal.targetDate
      : input.now,
    timezone,
  );

  return input.scheduledDays
    .filter((day) => day.expectedDoses > 0 && day.day <= lifecycleEndDay)
    .map((day) => ({
      day: day.day,
      expected: Math.max(0, Number(day.expectedDoses) || 0),
      taken: Math.min(
        Math.max(0, Number(day.expectedDoses) || 0),
        takenByDay.get(day.day) ?? 0,
      ),
    }));
}

function scheduleDayIsActive(
  schedule: MedicationSchedule,
  day: string,
  timezone: string,
): boolean {
  if (schedule.startedAt && dateKey(new Date(schedule.startedAt), timezone) > day) return false;
  if (schedule.endedAt && dateKey(new Date(schedule.endedAt), timezone) < day) return false;

  if (
    schedule.activeDaysOfWeek?.length &&
    !schedule.activeDaysOfWeek.includes(weekday(day))
  ) {
    return false;
  }

  return true;
}

function weekday(day: string): number {
  const date = new Date(`${day}T12:00:00Z`);
  const sundayZero = date.getUTCDay();
  return sundayZero === 0 ? 7 : sundayZero;
}

function bucketForTimestamp(
  value: Date,
  timezone: string,
): ClinicalTimeBucket | null {
  const minutes = timeToMinutes(localTime(value, timezone));
  if (minutes >= 5 * 60 && minutes < 12 * 60) return 'MORNING';
  if (minutes >= 12 * 60 && minutes < 17 * 60) return 'AFTERNOON';
  if (minutes >= 17 * 60 || minutes < 5 * 60) return 'EVENING_NIGHT';
  return null;
}

function isMinuteInBucket(
  minute: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes < 24 * 60 && endMinutes <= 24 * 60) {
    return minute >= startMinutes && minute < endMinutes;
  }

  return minute >= startMinutes || minute < endMinutes - 24 * 60;
}

function localTime(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function timeToMinutes(value: string): number {
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function dateKey(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function inclusiveDayCount(start: string, end: string): number {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  if (endDate < startDate) return 1;
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
}

function normalizeTarget(target: number): number {
  const numeric = Number(target);
  if (!Number.isFinite(numeric)) return 90;
  return numeric <= 1 ? round(numeric * 100) : round(numeric);
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' and ');
  return names.slice(0, -1).join(', ') + ', and ' + names.at(-1);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function renderTemplate(
  template: string,
  tokens: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token: string) => {
    const value = tokens[token];
    return value == null ? '' : String(value);
  });
}
