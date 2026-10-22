import { HealthReportIntelligenceService } from './health-report-intelligence.service';

describe('HealthReportIntelligenceService', () => {
  const service = new HealthReportIntelligenceService();
  const reportPeriod = {
    start: '2026-10-12T22:00:00.000Z',
    end: '2026-10-19T22:00:00.000Z',
    label: '12–18 October 2026',
    scheduledFor: '2026-10-19T07:00:00.000Z',
  };

  function fixture(overrides: Record<string, unknown> = {}) {
    return {
      type: 'WEEKLY',
      period: reportPeriod,
      generatedAt: '2026-10-19T08:00:00.000Z',
      activity: {
        journalEntries: [],
        symptoms: [],
        appointments: [],
        patientVitals: [],
        deviceMeasurements: [],
        wellnessMetrics: [],
        sleepSessions: [],
        workouts: [],
        clinicalEpisodes: [],
      },
      clinical: {
        encounters: [],
        diagnoses: [],
        prescriptions: [],
        notes: [],
        vitals: [],
        labResults: [],
        imaging: [],
        procedures: [],
        carePlans: [],
        referrals: [],
      },
      currentSnapshot: {
        person: { dateOfBirth: '1990-01-01T00:00:00.000Z', gender: 'UNSPECIFIED' },
        conditions: [],
        diagnoses: [],
        allergies: [],
        medications: [],
        activeGoals: [],
      },
      goalMetricEvents: [],
      tracking: { goalProgress: [], riskAssessments: [] },
      ...overrides,
    };
  }

  it('splits a connected-device blood pressure reading into systolic and diastolic observations', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        deviceMeasurements: [{
          id: 'device-reading-1',
          measurementType: 'BLOOD_PRESSURE',
          value: 128,
          unit: 'mmHg',
          secondaryValue: 78,
          secondaryUnit: 'mmHg',
          measuredAt: '2026-10-14T08:00:00.000Z',
          receivedAt: '2026-10-14T08:02:00.000Z',
          source: 'wearable',
          device: { manufacturer: 'Example', model: 'BP monitor' },
        }],
      },
    });

    const observations = service.normalize(report);
    expect(observations.filter((item) => item.metric === 'bp.systolic')).toHaveLength(1);
    expect(observations.filter((item) => item.metric === 'bp.diastolic')).toHaveLength(1);
    expect(observations.find((item) => item.metric === 'bp.systolic')?.value).toBe(128);
    expect(observations.find((item) => item.metric === 'bp.diastolic')?.value).toBe(78);
    expect(observations[0].observedAt).toBe('2026-10-14T08:00:00.000Z');
  });

  it('normalizes dedicated Health Vitals records and marks missing event time as inferred', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        patientVitals: [{
          id: 'vitals-1',
          source: 'PATIENT',
          recordedAt: '2026-10-14T08:00:00.000Z',
          bloodPressureSystolic: 128,
          bloodPressureDiastolic: 78,
          heartRate: 74,
        }, {
          id: 'vitals-legacy',
          source: 'PATIENT',
          createdAt: '2026-10-15T08:00:00.000Z',
          oxygenSaturation: 70,
        }],
      },
    });

    const observations = service.normalize(report, 'patient-1');
    expect(observations.filter((item) => item.source.recordId === 'vitals-1')).toHaveLength(3);
    const oxygen = observations.find((item) => item.source.recordId === 'vitals-legacy');
    expect(oxygen?.metric).toBe('oxygen_saturation');
    expect(oxygen?.observedAtBasis).toBe('RECORD_TIME_FALLBACK');
    expect(oxygen?.quality.safetySignals).toContain('LOW_OXYGEN_REQUIRES_URGENT_RECHECK');
    expect(oxygen?.patientId).toBe('patient-1');
  });

  it('keeps plausible extreme readings distinct from invalid entry values', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        journalEntries: [{
          id: 'journal-extremes',
          title: 'Daily Health Check-in',
          createdAt: '2026-10-14T08:00:00.000Z',
          temperature: 45,
          oxygenSaturation: 70,
        }],
      },
    });

    const observations = service.normalize(report);
    const temperature = observations.find((item) => item.metric === 'body_temperature');
    const oxygen = observations.find((item) => item.metric === 'oxygen_saturation');
    expect(temperature?.quality.status).toBe('NEEDS_REVIEW');
    expect(temperature?.quality.flags).toContain('TEMPERATURE_VERIFY_ENTRY');
    expect(oxygen?.quality.status).toBe('ACCEPTED');
    expect(oxygen?.quality.safetySignals).toContain('LOW_OXYGEN_REQUIRES_URGENT_RECHECK');
  });

  it('uses symptom monitoring records as dated follow-up severity and pain observations', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        symptoms: [{
          id: 'symptom-1',
          source: 'PATIENT',
          title: 'Back pain',
          startedAt: '2026-10-13T08:00:00.000Z',
          overallSeverity: 'MILD',
          observations: [{
            id: 'ai-observation-1',
            observation: 'AI narrative only',
            createdAt: '2026-10-14T08:00:00.000Z',
          }],
          monitorings: [{
            id: 'monitoring-1',
            observedAt: '2026-10-15T08:00:00.000Z',
            severity: 'SEVERE',
            progression: 'WORSENING',
            painScore: 8,
            stillPresent: true,
            source: 'MANUAL',
          }],
        }],
      },
    });

    const observations = service.normalize(report);
    const followUp = observations.filter((item) => item.source.type === 'SYMPTOM_FOLLOW_UP');
    expect(followUp.map((item) => item.metric).sort()).toEqual(['symptom.pain_score', 'symptom.severity']);
    expect(followUp.every((item) => item.observedAt === '2026-10-15T08:00:00.000Z')).toBe(true);
    expect(followUp.find((item) => item.metric === 'symptom.severity')?.valueCode).toBe('SEVERE');
  });

  it('scores only unique patient-driven logging days and excludes appointments, clinician records and device sync', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        journalEntries: [
          { id: 'j1', title: 'Daily Health Check-in', createdAt: '2026-10-13T08:00:00.000Z', stressLevel: 5 },
          { id: 'j2', title: 'Daily Health Check-in', createdAt: '2026-10-13T16:00:00.000Z', stressLevel: 4 },
          { id: 'j-clinical', title: 'Clinical update', createdAt: '2026-10-16T08:00:00.000Z', practitionerId: 'practitioner-1' },
        ],
        symptoms: [{
          id: 's1',
          source: 'PATIENT',
          startedAt: '2026-10-14T08:00:00.000Z',
          monitorings: [{ id: 'm1', observedAt: '2026-10-15T08:00:00.000Z', severity: 'MILD', source: 'MANUAL' }],
        }],
        appointments: [{ id: 'appointment-1', scheduledStart: '2026-10-16T08:00:00.000Z' }],
        deviceMeasurements: [{
          id: 'device-1', measurementType: 'HEART_RATE', value: 72, unit: 'bpm',
          measuredAt: '2026-10-17T08:00:00.000Z', source: 'wearable',
        }],
      },
      clinical: {
        ...fixture().clinical,
        encounters: [{ id: 'encounter-1', startedAt: '2026-10-16T08:00:00.000Z' }],
      },
      goalMetricEvents: [{
        metricType: 'MEDICATION',
        metricKey: 'medication.adherence',
        loggedValue: 1,
        occurredAt: '2026-10-18T08:00:00.000Z',
        source: 'medication-adherence',
        sourceId: 'dose-1',
        metadata: { action: 'TAKEN' },
      }],
    });

    const result = service.analyze(report, 'patient-1');
    expect(result.loggingConsistency.days).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-18',
    ]);
    expect(result.loggingConsistency.loggedDays).toBe(4);
    expect(result.loggingConsistency.eligibleDays).toBe(7);
    expect(result.loggingConsistency.percentage).toBe(57);
  });

  it('emits a cautious same-day sleep/stress association only when paired evidence is sufficient', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        journalEntries: [
          { id: 'j1', createdAt: '2026-10-13T08:00:00.000Z', sleepHours: 5, stressLevel: 8 },
          { id: 'j2', createdAt: '2026-10-14T08:00:00.000Z', sleepHours: 4, stressLevel: 7 },
          { id: 'j3', createdAt: '2026-10-15T08:00:00.000Z', sleepHours: 8, stressLevel: 4 },
          { id: 'j4', createdAt: '2026-10-16T08:00:00.000Z', sleepHours: 7, stressLevel: 3 },
        ],
      },
    });

    const result = service.analyze(report);
    expect(result.crossSignals.sleepStress.status).toBe('SUPPORTED_PATTERN');
    expect(result.crossSignals.sleepStress.overlappingDays).toBe(4);
    expect(result.crossSignals.sleepStress.difference).toBe(4);
    expect(result.crossSignals.sleepStress.statement).toContain('not evidence that one caused the other');
  });

  it('uses saved condition, goal and baseline context to interpret dated period readings', () => {
    const base = fixture();
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
        activeGoals: [{
          id: 'goal-weight',
          title: 'Maintain weight',
          category: 'WEIGHT',
          status: 'ACTIVE',
          targetValue: 71,
          unit: 'kg',
        }],
        baseline: { weightKg: 71, establishedAt: '2026-10-01T08:00:00.000Z' },
      },
      activity: {
        ...base.activity,
        patientVitals: [{
          id: 'vitals-weight-1',
          source: 'PATIENT',
          recordedAt: '2026-10-14T08:00:00.000Z',
          weightKg: 70.1,
        }],
      },
      goalMetricEvents: [{
        goalId: null,
        goalTitle: 'Blood glucose',
        metricType: 'BLOOD_GLUCOSE',
        metricKey: 'blood_glucose',
        loggedValue: 5.5,
        unit: 'mmol/L',
        occurredAt: '2026-10-14T08:00:00.000Z',
        source: 'patient-health-goal',
        sourceId: 'glucose-event-1',
      }],
    });

    const result = service.analyze(report, 'patient-1');
    const conditionInsight = result.personalisedContext.insights.find((item) => item.group === 'CONDITION');
    const goalInsight = result.personalisedContext.insights.find((item) => item.group === 'GOAL' && item.title === 'Maintain weight');
    const baselineInsight = result.personalisedContext.insights.find((item) =>
      item.group === 'BASELINE' && item.title.startsWith('Weight'));

    expect(conditionInsight?.title).toContain('Diabetes');
    expect(conditionInsight?.headline).toContain('5.5 mmol/L');
    expect(goalInsight?.title).toContain('Maintain weight');
    expect(goalInsight?.headline).toContain('70.1 kg');
    expect(baselineInsight?.headline).toContain('saved baseline 71 kg');
    expect(baselineInsight?.detail).toContain('-0.9 kg');
  });

  it('connects saved allergy and medicine context only to explicit symptom-record mentions', () => {
    const base = fixture();
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        allergies: [{ id: 'allergy-1', status: 'ACTIVE', allergy: { name: 'Penicillin' } }],
        medications: [{
          id: 'medicine-1',
          status: 'ACTIVE',
          ongoing: true,
          medication: { name: 'Amoxicillin' },
        }],
      },
      activity: {
        ...base.activity,
        symptoms: [{
          id: 'symptom-1',
          title: 'Rash after medicine',
          startedAt: '2026-10-14T08:00:00.000Z',
          triggers: [{ trigger: 'Penicillin exposure' }],
          medicationEffects: [{
            reportedMedicationName: 'Amoxicillin',
            sideEffects: 'Rash reported',
          }],
        }],
      },
    });

    const result = service.analyze(report, 'patient-1');
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'ALLERGY' && item.headline.includes('Penicillin'))).toBe(true);
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'TREATMENT' && item.headline.includes('Amoxicillin'))).toBe(true);
  });

  it('does not emit a sleep/stress pattern with insufficient paired days', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        journalEntries: [{
          id: 'j1', createdAt: '2026-10-13T08:00:00.000Z', sleepHours: 5, stressLevel: 8,
        }],
      },
    });

    expect(service.analyze(report).crossSignals.sleepStress.status).toBe('INSUFFICIENT_DATA');
  });
});
