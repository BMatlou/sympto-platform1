import { MedicationInsightService } from './medication-insight.service';
import { PrismaService } from '../../database/prisma.service';
import { MedicationConnectedGoalsEngine } from './medication-connected-goals.engine';
import { MedicationGoalIntelligenceEngine } from './medication-goal-intelligence.engine';
import { MedicationClinicalIntelligenceEngine } from './medication-clinical-intelligence.engine';

describe('MedicationInsightService report adherence', () => {
  const patientId = 'patient-1';
  const periodStart = new Date('2026-10-11T22:00:00.000Z');
  const periodEnd = new Date('2026-10-18T22:00:00.000Z');

  function medicine(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pm-1',
      healthPassportId: 'passport-1',
      medicationId: 'med-1',
      dosage: '1 tablet',
      frequency: 'FOUR_TIMES_DAILY',
      instructions: null,
      startedAt: periodStart,
      endedAt: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-09-01T08:00:00.000Z'),
      medication: { id: 'med-1', name: 'Example medicine' },
      reminderSchedule: {
        enabled: false,
        daysOfWeek: [],
        timezone: 'Africa/Johannesburg',
        slots: [],
      },
      ...overrides,
    };
  }

  function makeService(medicines: unknown[], events: unknown[]) {
    const prisma = {
      patientMedication: {
        findMany: jest.fn().mockResolvedValue(medicines),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue(events),
    };
    const service = new MedicationInsightService(
      prisma as unknown as PrismaService,
      {} as MedicationConnectedGoalsEngine,
      {} as MedicationGoalIntelligenceEngine,
      {} as MedicationClinicalIntelligenceEngine,
    );
    return { service, prisma };
  }

  it('uses the expected scheduled-dose denominator and explicit outcomes only', async () => {
    const { service } = makeService([medicine()], [
      {
        occurredAt: new Date('2026-10-12T07:00:00.000Z'),
        sourceId: 'pm-1:2026-10-12:0',
        loggedValue: 100,
        metadata: { patientMedicationId: 'pm-1', action: 'TAKEN' },
      },
      {
        occurredAt: new Date('2026-10-12T08:00:00.000Z'),
        sourceId: 'pm-1:2026-10-12:1',
        loggedValue: 0,
        metadata: { patientMedicationId: 'pm-1', action: 'SKIPPED' },
      },
      {
        occurredAt: new Date('2026-10-13T07:00:00.000Z'),
        sourceId: 'pm-1:2026-10-13:0',
        loggedValue: 100,
        metadata: { patientMedicationId: 'pm-1', action: 'TAKEN' },
      },
      {
        occurredAt: new Date('2026-10-14T07:00:00.000Z'),
        sourceId: 'pm-1:2026-10-14',
        loggedValue: 50,
        metadata: { patientMedicationId: 'pm-1' },
      },
    ]);

    const result = await service.buildReportAdherence(patientId, periodStart, periodEnd);
    expect(result.status).toBe('CALCULATED');
    expect(result.expectedDoses).toBe(28);
    expect(result.takenDoses).toBe(2);
    expect(result.skippedDoses).toBe(1);
    expect(result.unrecordedDoses).toBe(25);
    expect(result.explicitActionCount).toBe(3);
    expect(result.legacyEventsNotUsed).toBe(1);
    expect(result.adherencePercent).toBeNull();
    expect(result.outcomeRecordingPercent).toBe(10.71);
    expect(result.medications[0].adherencePercent).toBeNull();
    expect(result.medications[0].outcomeRecordingPercent).toBe(10.71);
    expect(result.medications[0].scheduleSource).toBe('FREQUENCY_FALLBACK');
    expect(result.medications[0].daily).toHaveLength(7);
  });

  it('confirms adherence when every expected scheduled outcome is explicit', async () => {
    const start = new Date('2026-10-11T22:00:00.000Z');
    const end = new Date('2026-10-12T22:00:00.000Z');
    const actions = [
      ['07:00:00.000Z', 'TAKEN'],
      ['10:00:00.000Z', 'TAKEN'],
      ['13:00:00.000Z', 'TAKEN'],
      ['16:00:00.000Z', 'SKIPPED'],
    ].map(([time, action], index) => ({
      occurredAt: new Date('2026-10-12T' + time),
      sourceId: 'pm-1:2026-10-12:' + index,
      loggedValue: action === 'TAKEN' ? 100 : 0,
      metadata: { patientMedicationId: 'pm-1', action },
    }));
    const { service } = makeService([medicine({ startedAt: start })], actions);

    const result = await service.buildReportAdherence(patientId, start, end);
    expect(result.expectedDoses).toBe(4);
    expect(result.takenDoses).toBe(3);
    expect(result.skippedDoses).toBe(1);
    expect(result.unrecordedDoses).toBe(0);
    expect(result.outcomeRecordingPercent).toBe(100);
    expect(result.adherencePercent).toBe(75);
    expect(result.medications[0].adherencePercent).toBe(75);
  });

  it('does not turn legacy inferred entries into explicit dose actions or zero-percent adherence', async () => {
    const { service } = makeService([medicine()], [
      {
        occurredAt: new Date('2026-10-14T07:00:00.000Z'),
        sourceId: 'pm-1:2026-10-14',
        loggedValue: 50,
        metadata: { patientMedicationId: 'pm-1' },
      },
    ]);

    const result = await service.buildReportAdherence(patientId, periodStart, periodEnd);
    expect(result.expectedDoses).toBe(28);
    expect(result.takenDoses).toBe(0);
    expect(result.unrecordedDoses).toBe(28);
    expect(result.explicitActionCount).toBe(0);
    expect(result.legacyEventsNotUsed).toBe(1);
    expect(result.adherencePercent).toBeNull();
    expect(result.outcomeRecordingPercent).toBe(0);
    expect(result.medications[0].adherencePercent).toBeNull();
    expect(result.medications[0].outcomeRecordingPercent).toBe(0);
  });

  it('does not invent a denominator for as-needed medicine', async () => {
    const { service } = makeService([medicine({ frequency: 'AS_NEEDED' })], []);
    const result = await service.buildReportAdherence(patientId, periodStart, periodEnd);

    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.expectedDoses).toBe(0);
    expect(result.adherencePercent).toBeNull();
    expect(result.medications[0].status).toBe('AS_NEEDED_NO_FIXED_DENOMINATOR');
  });
});
