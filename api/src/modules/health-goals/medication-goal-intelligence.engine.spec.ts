import {
  calculateMedicationGoalIntelligence,
  type MedicationGoalIntelligenceInput,
} from './medication-goal-intelligence.engine';
import type {
  MedicationDayBucket,
  MedicationSchedule,
  MedicationTrendResult,
} from './medication-insight.service';

function schedule(): MedicationSchedule {
  return {
    patientMedicationId: 'metformin-pm',
    medicationId: 'metformin',
    name: 'Metformin',
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
    scheduleSource: 'FREQUENCY_FALLBACK',
  };
}

function trend(): MedicationTrendResult {
  return {
    state: 'INSUFFICIENT_DATA',
    daysAnalyzed: 0,
    daysWithExplicitActions: 0,
    baselinePercent: null,
    recentPercent: null,
    deltaPercentagePoints: null,
  };
}

function bucket(
  day: string,
  takenDoses: number,
  expectedDoses = 3,
  skippedDoses = 0,
): MedicationDayBucket {
  const recordedActions = Math.min(expectedDoses, takenDoses + skippedDoses);
  const unrecordedDoses = Math.max(0, expectedDoses - recordedActions);
  return {
    day,
    expectedDoses,
    takenDoses,
    skippedDoses,
    recordedActions,
    unrecordedDoses,
    adherencePercent:
      expectedDoses > 0
        ? Number(((takenDoses / expectedDoses) * 100).toFixed(2))
        : 0,
  };
}

function baseInput(overrides: Partial<MedicationGoalIntelligenceInput> = {}): MedicationGoalIntelligenceInput {
  const now = new Date('2026-10-05T10:00:00.000Z');
  const buckets = [
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
  ].map((day, index) => bucket(day, index < 6 ? 3 : 0));

  const journeyAdherence = {
    takenDoses: 18,
    expectedScheduledDoses: 42,
    adherencePercent: Number(((18 / 42) * 100).toFixed(2)),
  };

  return {
    targetAdherencePercent: 90,
    targetDate: new Date(now.getTime()),
    now,
    timezone: 'Africa/Johannesburg',
    schedule: schedule(),
    dailyBuckets: buckets,
    journeyAdherence,
    trend: trend(),
    ...overrides,
  };
}

describe('MedicationGoalIntelligenceEngine', () => {
  it('turns a 18/42 journey into goal-specific recovery intelligence', () => {
    const now = new Date('2026-10-05T10:00:00.000Z');
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + 594);

    const result = calculateMedicationGoalIntelligence(
      baseInput({ targetDate }),
    );

    expect(result.currentAdherencePercent).toBe(42.86);
    expect(result.gapPercentagePoints).toBe(47.14);
    expect(result.takenDoses).toBe(18);
    expect(result.scheduledDoses).toBe(42);
    expect(result.additionalDosesNeeded).toBe(1621);
    expect(result.futureScheduledDoses).toBe(1782);
    expect(result.status).toBe('BEHIND_RECOVERABLE');
    expect(result.requiredFutureAdherencePercent).toBeCloseTo(90.97, 1);
    expect(result.projectedFinalAdherenceAtCurrentPace).toBeCloseTo(42.86, 1);
    expect(result.insight).toContain('18');
    expect(result.insight).toContain('90%');
  });

  it('does not call a goal behind when current adherence already meets the target', () => {
    const result = calculateMedicationGoalIntelligence(
      baseInput({
        journeyAdherence: {
          takenDoses: 40,
          expectedScheduledDoses: 42,
          adherencePercent: Number(((40 / 42) * 100).toFixed(2)),
        },
      }),
    );

    expect(result.status).toBe('ON_TARGET');
    expect(result.gapPercentagePoints).toBe(-5.24);
    expect(result.insight).toContain('on target');
  });

  it('keeps skipped and unrecorded doses separate from taken doses', () => {
    const result = calculateMedicationGoalIntelligence(
      baseInput({
        dailyBuckets: [
          bucket('2026-10-01', 3),
          bucket('2026-10-02', 2, 3, 1),
          bucket('2026-10-03', 0, 3, 0),
        ],
        journeyAdherence: {
          takenDoses: 5,
          expectedScheduledDoses: 9,
          adherencePercent: Number(((5 / 9) * 100).toFixed(2)),
        },
      }),
    );

    expect(result.skippedDoses).toBe(1);
    expect(result.unrecordedDoses).toBe(2);
    expect(result.completedDays).toBe(1);
    expect(result.partialDays).toBe(1);
    expect(result.missedDays).toBe(1);
  });
});
