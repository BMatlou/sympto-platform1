import type { MedicationDayBucket, MedicationSchedule } from './medication-insight.service';
import {
  MedicationClinicalIntelligenceEngine,
  type ClinicalJournalEvent,
  type ClinicalMedicationEvent,
  type ClinicalSupportingGoal,
} from './medication-clinical-intelligence.engine';

function schedule(): MedicationSchedule {
  return {
    patientMedicationId: 'pm-1',
    medicationId: 'med-1',
    name: 'Any medicine',
    dosage: '200 mg',
    frequency: 'THREE_TIMES_DAILY',
    instructions: null,
    startedAt: '2026-09-22T00:00:00.000Z',
    endedAt: null,
    status: 'ACTIVE',
    timezone: 'Africa/Johannesburg',
    dosesPerDay: 3,
    activeDaysOfWeek: null,
    reminderSlots: ['08:00', '13:00', '19:00'],
    scheduleSource: 'REMINDER_SCHEDULE',
  };
}

function buckets(): MedicationDayBucket[] {
  return [
    '2026-09-22',
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
    '2026-09-27',
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
  ].map((day) => ({
    day,
    expectedDoses: 3,
    takenDoses: 0,
    skippedDoses: 0,
    recordedActions: 0,
    unrecordedDoses: 3,
    adherencePercent: 0,
  }));
}

function event(timestamp: string, action: ClinicalMedicationEvent['action']): ClinicalMedicationEvent {
  return { timestamp: new Date(timestamp), action };
}

describe('MedicationClinicalIntelligenceEngine', () => {
  const engine = new MedicationClinicalIntelligenceEngine();
  const now = new Date('2026-10-05T20:00:00.000+02:00');

  it('preserves the current 18/42 trajectory while calculating lifetime recovery separately', () => {
    const events = Array.from({ length: 18 }, (_, index) =>
      event(`2026-09-22T${String(8 + (index % 3) * 5).padStart(2, '0')}:00:00+02:00`, 'TAKEN'),
    );

    const result = engine.calculate({
      medicationGoal: {
        medicationId: 'med-1',
        name: 'Any medicine',
        frequency: 3,
        startDate: new Date('2026-09-22T00:00:00+02:00'),
        targetDate: new Date('2027-05-17T00:00:00+02:00'),
        targetAdherence: 0.9,
      },
      medicationEvents: events,
      supportingGoals: [],
      journalEvents: [],
      medicationSchedule: schedule(),
      scheduledDays: buckets(),
      now,
      timezone: 'Africa/Johannesburg',
    });

    expect(result.trajectory.expectedDosesToDate).toBe(42);
    expect(result.trajectory.adherencePercent).toBe(42.86);
    expect(result.trajectory.targetAdherencePercent).toBe(90);
    expect(result.trajectory.variancePercentagePoints).toBe(-47.14);
    expect(result.trajectory.lifetimeExpectedDoses).toBeGreaterThan(42);
    expect(result.trajectory.remainingDosesNeededForTarget).toBeGreaterThan(0);
  });

  it('flags a chronological interference bucket only when expected failures reach the configured threshold', () => {
    const events = [
      event('2026-10-02T08:00:00+02:00', 'TAKEN'),
      event('2026-10-02T13:00:00+02:00', 'SKIPPED'),
      event('2026-10-02T19:00:00+02:00', 'SKIPPED'),
      event('2026-10-03T08:00:00+02:00', 'TAKEN'),
      event('2026-10-03T13:00:00+02:00', 'SKIPPED'),
      event('2026-10-03T19:00:00+02:00', 'SKIPPED'),
      event('2026-10-04T08:00:00+02:00', 'TAKEN'),
      event('2026-10-04T13:00:00+02:00', 'TAKEN'),
      event('2026-10-04T19:00:00+02:00', 'SKIPPED'),
    ];

    const result = engine.calculate({
      medicationGoal: {
        medicationId: 'med-1',
        name: 'Any medicine',
        frequency: 3,
        startDate: new Date('2026-09-22T00:00:00+02:00'),
        targetDate: null,
        targetAdherence: 0.9,
      },
      medicationEvents: events,
      supportingGoals: [],
      journalEvents: [],
      medicationSchedule: schedule(),
      scheduledDays: buckets(),
      now,
      timezone: 'Africa/Johannesburg',
    });

    expect(result.chronologicalInterference?.label).toBe('Evening/Night');
    expect(result.chronologicalInterference?.failureRatePercent).toBeGreaterThanOrEqual(50);
  });

  it('derives a temporal signal from historical action timestamps when no reminder slots exist', () => {
    const events = Array.from({ length: 18 }, (_, index) =>
      event(
        \`2026-09-\${String(22 + Math.floor(index / 3)).padStart(2, '0')}T19:00:00+02:00\`,
        'TAKEN',
      ),
    );

    const result = engine.calculate({
      medicationGoal: {
        medicationId: 'med-1',
        name: 'Any medicine',
        frequency: 3,
        startDate: new Date('2026-09-22T00:00:00+02:00'),
        targetDate: new Date('2027-05-17T00:00:00+02:00'),
        targetAdherence: 0.9,
      },
      medicationEvents: events,
      supportingGoals: [],
      journalEvents: [],
      medicationSchedule: {
        ...schedule(),
        reminderSlots: [],
      },
      scheduledDays: buckets(),
      now,
      timezone: 'Africa/Johannesburg',
    });

    expect(result.clinicalNarrative.baseline.adherencePercent).toBe(42.86);
    expect(result.timeBuckets.some((bucket) => bucket.expectedDoses > 0)).toBe(true);
    expect(result.chronologicalInterference).not.toBeNull();
    expect(result.chronologicalInterference?.label).toBe('Evening/Night');
  });

  it('uses the strongest temporal window to evaluate a linked routine even when the failure threshold is not crossed', () => {
    const supportGoal: ClinicalSupportingGoal = {
      goalId: 'goal-sleep',
      name: 'Sleep duration',
      category: 'SLEEP',
      unit: 'hours',
      targetValue: 6,
      frequency: 'DAILY',
      metricType: 'SLEEP',
      metricKey: 'sleep.duration',
      aggregation: 'LATEST',
      comparison: 'AT_LEAST',
      createdAt: new Date('2026-09-22T00:00:00+02:00'),
    };

    const journalEvents: ClinicalJournalEvent[] = [
      { goalId: 'goal-sleep', timestamp: new Date('2026-09-22T22:00:00+02:00'), value: 6, source: 'journal' },
      { goalId: 'goal-sleep', timestamp: new Date('2026-09-23T22:00:00+02:00'), value: 6, source: 'journal' },
      { goalId: 'goal-sleep', timestamp: new Date('2026-09-24T22:00:00+02:00'), value: 6, source: 'journal' },
      { goalId: 'goal-sleep', timestamp: new Date('2026-09-25T22:00:00+02:00'), value: 6, source: 'journal' },
      { goalId: 'goal-sleep', timestamp: new Date('2026-09-26T22:00:00+02:00'), value: 6, source: 'journal' },
    ];

    const events = [
      event('2026-09-22T19:00:00+02:00', 'TAKEN'),
      event('2026-09-22T08:00:00+02:00', 'TAKEN'),
      event('2026-09-23T19:00:00+02:00', 'TAKEN'),
      event('2026-09-24T19:00:00+02:00', 'TAKEN'),
      event('2026-09-25T19:00:00+02:00', 'TAKEN'),
      event('2026-09-26T19:00:00+02:00', 'TAKEN'),
      event('2026-09-27T08:00:00+02:00', 'TAKEN'),
      event('2026-09-28T08:00:00+02:00', 'TAKEN'),
    ];

    const result = engine.calculate({
      medicationGoal: {
        medicationId: 'med-1',
        name: 'Any medicine',
        frequency: 1,
        startDate: new Date('2026-09-22T00:00:00+02:00'),
        targetDate: null,
        targetAdherence: 0.9,
      },
      medicationEvents: events,
      supportingGoals: [supportGoal],
      journalEvents,
      medicationSchedule: {
        ...schedule(),
        frequency: 'ONCE_DAILY',
        dosesPerDay: 1,
        reminderSlots: ['19:00'],
      },
      scheduledDays: buckets().map((day) => ({
        ...day,
        expectedDoses: 1,
        takenDoses: 0,
        unrecordedDoses: 1,
      })),
      now,
      timezone: 'Africa/Johannesburg',
    });

    expect(result.clinicalNarrative.routineAnchor).not.toBeNull();
    expect(result.clinicalNarrative.routineAnchor?.goalName).toBe('Sleep duration');
    expect(result.clinicalNarrative.routineAnchor?.deltaPercentagePoints).toBeGreaterThanOrEqual(15);
  });

  it('joins linked goal journal days to medication days without treating missing data as a positive event', () => {
    const supportGoal: ClinicalSupportingGoal = {
      goalId: 'goal-nutrition',
      name: 'Daily nutrition target',
      category: 'NUTRITION',
      unit: 'kcal/day',
      targetValue: 1000,
      frequency: 'DAILY',
      metricType: 'NUTRITION',
      metricKey: 'nutrition.calories',
      aggregation: 'LATEST',
      comparison: 'AT_MOST',
      createdAt: new Date('2026-09-22T00:00:00+02:00'),
    };

    const journalEvents: ClinicalJournalEvent[] = [
      { goalId: 'goal-nutrition', timestamp: new Date('2026-09-22T12:00:00+02:00'), value: 900, source: 'journal' },
      { goalId: 'goal-nutrition', timestamp: new Date('2026-09-23T12:00:00+02:00'), value: 950, source: 'journal' },
      { goalId: 'goal-nutrition', timestamp: new Date('2026-09-24T12:00:00+02:00'), value: 980, source: 'journal' },
    ];

    const medEvents = [
      ...Array.from({ length: 9 }, (_, index) =>
        event(`2026-09-${String(22 + Math.floor(index / 3)).padStart(2, '0')}T08:00:00+02:00`, 'TAKEN'),
      ),
      event('2026-09-25T08:00:00+02:00', 'TAKEN'),
    ];

    const result = engine.calculate({
      medicationGoal: {
        medicationId: 'med-1',
        name: 'Any medicine',
        frequency: 1,
        startDate: new Date('2026-09-22T00:00:00+02:00'),
        targetDate: null,
        targetAdherence: 0.9,
      },
      medicationEvents: medEvents,
      supportingGoals: [supportGoal],
      journalEvents,
      medicationSchedule: {
        ...schedule(),
        dosesPerDay: 1,
        reminderSlots: ['08:00'],
      },
      scheduledDays: buckets().map((day) => ({
        ...day,
        expectedDoses: 1,
        takenDoses: 0,
        unrecordedDoses: 1,
      })),
      now,
      timezone: 'Africa/Johannesburg',
    });

    const association = result.crossGoalAssociations[0];
    expect(association.loggedDays).toBe(3);
    expect(association.nonLoggedDays).toBeGreaterThan(0);
    expect(association.adherenceOnLoggedDays).toBeGreaterThan(
      association.adherenceOnNonLoggedDays ?? 0,
    );
    expect(association.deltaPercentagePoints).not.toBeNull();
  });
});
