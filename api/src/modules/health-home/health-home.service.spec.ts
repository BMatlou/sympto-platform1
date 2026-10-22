import { HealthHomeService } from './health-home.service';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';
import { HealthGoalIntelligenceService } from '../health-goals/health-goal-intelligence.service';

describe('HealthHomeService baseline protection', () => {
  function setup() {
    const baseline = {
      id: 'baseline-1',
      patientId: 'patient-1',
      weightKg: '68.00',
      heightCm: '187.00',
      bmi: '19.45',
      systolicPressure: 118,
      diastolicPressure: 76,
      restingHeartRate: 72,
      establishedAt: new Date('2026-01-01T08:00:00.000Z'),
    };
    const prisma = {
      patient: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'patient-1',
          weightKg: '68.00',
          heightCm: '187.00',
          baseline,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      patientBaseline: {
        upsert: jest.fn().mockResolvedValue(baseline),
        update: jest.fn().mockResolvedValue(baseline),
      },
      healthJournal: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'journal-1' }),
        update: jest.fn().mockResolvedValue({ id: 'journal-1' }),
      },
    };
    const goalsEngine = { recordMetricEvent: jest.fn().mockResolvedValue([]) };
    const service = new HealthHomeService(
      prisma as unknown as PrismaService,
      goalsEngine as unknown as GoalsEngineService,
      {} as HealthGoalIntelligenceService,
    );
    return { service, prisma, goalsEngine, baseline };
  }

  it('records manual vitals without upserting or rewriting the established baseline', async () => {
    const { service, prisma, goalsEngine, baseline } = setup();

    const result = await service.recordManualVitals('user-1', {
      weightKg: 70,
      heightCm: 187,
      systolicPressure: 128,
      diastolicPressure: 78,
      restingHeartRate: 79,
      measuredAt: '2026-10-15T08:00:00.000Z',
    });

    expect(prisma.patient.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patient-1' },
      data: { weightKg: 70, heightCm: 187 },
    }));
    expect(prisma.patientBaseline.upsert).not.toHaveBeenCalled();
    expect(prisma.patientBaseline.update).not.toHaveBeenCalled();
    expect(prisma.healthJournal.create).toHaveBeenCalled();
    expect(goalsEngine.recordMetricEvent).toHaveBeenCalled();
    expect(result.baseline).toBe(baseline);
    expect(result.recordedAt).toBe('2026-10-15T08:00:00.000Z');
  });

  it('updates the current weight without replacing the reference baseline', async () => {
    const { service, prisma, goalsEngine } = setup();

    const result = await service.updateWeight('user-1', 71, 187);

    expect(prisma.patient.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patient-1' },
      data: { weightKg: 71, heightCm: 187 },
    }));
    expect(prisma.patientBaseline.upsert).not.toHaveBeenCalled();
    expect(prisma.patientBaseline.update).not.toHaveBeenCalled();
    expect(goalsEngine.recordMetricEvent).toHaveBeenCalled();
    expect(result.weightKg).toBe(71);
  });
});
