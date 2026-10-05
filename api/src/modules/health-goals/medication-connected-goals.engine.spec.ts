import {
  MedicationConnectedGoalsEngine,
  validateMedicationComparison,
} from './medication-connected-goals.engine';

describe('MedicationConnectedGoalsEngine', () => {
  const engine = new MedicationConnectedGoalsEngine();

  const nutritionGoal = {
    healthGoalId: 'nutrition-goal',
    category: 'NUTRITION' as const,
    title: 'Nutrition · Daily calorie target',
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    relationshipType: 'SUPPORTS' as const,
    rationale: null,
    metricType: 'NUTRITION',
    metricKey: 'nutrition.calories',
    frequency: 'DAILY',
    frequencyTarget: 1000,
    aggregation: 'SUM',
    comparison: 'AT_MOST',
  };

  const supportingEvents = [
    ['2026-10-01T10:00:00Z', 800],
    ['2026-10-02T10:00:00Z', 900],
    ['2026-10-03T10:00:00Z', 1200],
    ['2026-10-04T10:00:00Z', 1500],
  ].map(([occurredAt, loggedValue]) => ({
    healthGoalId: 'nutrition-goal',
    occurredAt: new Date(String(occurredAt)),
    loggedValue: Number(loggedValue),
    source: 'goal-manual',
    sourceId: 'goal-nutrition-goal-' + String(occurredAt),
    metadata: null,
  }));

  const scheduledDays = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ].map((day) => ({
    day,
    expectedDoses: 3,
    takenDoses: 0,
    skippedDoses: 0,
    recordedActions: 0,
    unrecordedDoses: 0,
    adherencePercent: 0,
  }));

  it('joins supporting-goal status to the exact medication calendar dates', () => {
    const result = engine.calculate({
      patientMedicationId: 'metformin',
      now: new Date('2026-10-05T12:00:00Z'),
      timezone: 'Africa/Johannesburg',
      scheduledDays,
      supportingGoals: [nutritionGoal],
      supportingGoalEvents: supportingEvents,
      doseEvents: [
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T18:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T18:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-03T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-04T08:00:00Z'), action: 'TAKEN' },
      ],
    });

    const insight = result[0];
    expect(insight.onTarget.scheduledDoses).toBe(6);
    expect(insight.onTarget.takenDoses).toBe(6);
    expect(insight.offTarget.scheduledDoses).toBe(6);
    expect(insight.offTarget.takenDoses).toBe(2);
    expect(insight.medicationDeltaPercentagePoints).toBeCloseTo(66.67, 2);
    expect(insight.comparisonValid).toBe(true);
  });

  it('never allows another medication profile to contribute dose events', () => {
    const result = engine.calculate({
      patientMedicationId: 'metformin',
      now: new Date('2026-10-05T12:00:00Z'),
      timezone: 'Africa/Johannesburg',
      scheduledDays,
      supportingGoals: [nutritionGoal],
      supportingGoalEvents: supportingEvents,
      doseEvents: [
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'paracetamol', occurredAt: new Date('2026-10-01T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'paracetamol', occurredAt: new Date('2026-10-01T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'paracetamol', occurredAt: new Date('2026-10-01T18:00:00Z'), action: 'TAKEN' },
      ],
    });

    const insight = result[0];
    expect(insight.onTarget.takenDoses).toBe(1);
    expect(insight.offTarget.takenDoses).toBe(0);
  });

  it('suppresses a zero-delta 100/100 comparison instead of rendering boilerplate', () => {
    const result = engine.calculate({
      patientMedicationId: 'metformin',
      now: new Date('2026-10-05T12:00:00Z'),
      timezone: 'Africa/Johannesburg',
      scheduledDays,
      supportingGoals: [nutritionGoal],
      supportingGoalEvents: supportingEvents,
      doseEvents: [
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-01T18:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-02T18:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-03T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-03T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-03T18:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-04T08:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-04T12:00:00Z'), action: 'TAKEN' },
        { patientMedicationId: 'metformin', occurredAt: new Date('2026-10-04T18:00:00Z'), action: 'TAKEN' },
      ],
    });

    const insight = result[0];
    expect(insight.onTarget.adherencePercent).toBe(100);
    expect(insight.offTarget.adherencePercent).toBe(100);
    expect(insight.medicationDeltaPercentagePoints).toBe(0);
    expect(insight.comparisonValid).toBe(false);
    expect(insight.insight).toBeNull();
  });

  it('suppresses a comparison when the joined result cannot reconcile to the journey', () => {
    const validation = validateMedicationComparison({
      onTarget: {
        calendarDays: 2,
        takenDoses: 6,
        scheduledDoses: 6,
        adherencePercent: 100,
      },
      offTarget: {
        calendarDays: 2,
        takenDoses: 0,
        scheduledDoses: 6,
        adherencePercent: 0,
      },
      comparisonCoverageDays: 4,
      eligibleJourneyDays: 4,
      comparisonCoversEntireEligibleJourney: true,
      overallAdherencePercent: 43,
    });

    expect(validation.comparisonValid).toBe(false);
    expect(validation.reason).toContain('does not reconcile');
  });

  it('rejects impossible taken-over-scheduled aggregates', () => {
    const validation = validateMedicationComparison({
      onTarget: {
        calendarDays: 2,
        takenDoses: 7,
        scheduledDoses: 6,
        adherencePercent: 116.67,
      },
      offTarget: {
        calendarDays: 2,
        takenDoses: 1,
        scheduledDoses: 6,
        adherencePercent: 16.67,
      },
      comparisonCoverageDays: 4,
      eligibleJourneyDays: 4,
      comparisonCoversEntireEligibleJourney: false,
      overallAdherencePercent: null,
    });

    expect(validation.comparisonValid).toBe(false);
    expect(validation.reason).toContain('exceed scheduled');
  });
});
