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
        }, {
          id: 'goal-mental-health',
          title: 'Mental health',
          category: 'MENTAL_HEALTH',
          status: 'ACTIVE',
          targetValue: 2,
          unit: '/10',
        }],
        baseline: { weightKg: 71, establishedAt: '2026-10-01T08:00:00.000Z' },
      },
      activity: {
        ...base.activity,
        journalEntries: [{
          id: 'journal-mood-1',
          title: 'Daily Health Check-in',
          createdAt: '2026-10-15T08:00:00.000Z',
          mood: 'LOW',
          energyLevel: 'LOW',
        }],
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
    const mentalGoalInsight = result.personalisedContext.insights.find((item) =>
      item.group === 'GOAL' && item.title === 'Mental health');
    expect(mentalGoalInsight?.headline.toLowerCase()).toContain('latest low');
    expect(baselineInsight?.headline).toContain('saved baseline 71 kg');
    expect(baselineInsight?.detail).toContain('-0.9 kg');
  });

  it('synthesises routine changes and diabetes-specific context instead of leaving the readings as a data dump', () => {
    const base = fixture();
    const days = [
      { day: '13', sleep: 4.8, stress: 5, water: 2100, exercise: 100, cigarettes: 7, glucose: 5.1 },
      { day: '14', sleep: 5.0, stress: 6, water: 2200, exercise: 120, cigarettes: 6, glucose: 5.4 },
      { day: '15', sleep: 4.5, stress: 5, water: 2300, exercise: 150, cigarettes: 5, glucose: 5.6 },
      { day: '16', sleep: 5.0, stress: 4, water: 2150, exercise: 170, cigarettes: 6, glucose: 5.3 },
    ];
    const goalMetricEvents = days.flatMap((item) => {
      const at = (value: string) => '2026-10-' + item.day + 'T08:00:00.000Z';
      return [
        { metricType: 'SLEEP_DURATION', metricKey: 'sleep.duration', loggedValue: item.sleep, unit: 'hours', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'sleep-' + item.day },
        { metricType: 'STRESS', metricKey: 'stress.score', loggedValue: item.stress, unit: '/10', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'stress-' + item.day },
        { metricType: 'HYDRATION', metricKey: 'hydration.volume', loggedValue: item.water, unit: 'mL', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'water-' + item.day },
        { metricType: 'EXERCISE_DURATION', metricKey: 'exercise.duration', loggedValue: item.exercise, unit: 'minutes', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'exercise-' + item.day },
        { metricType: 'SMOKING_CIGARETTE_COUNT', metricKey: 'smoking.cigarettes', loggedValue: item.cigarettes, unit: 'cigarettes', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'smoking-' + item.day },
        { metricType: 'BLOOD_GLUCOSE', metricKey: 'blood_glucose', loggedValue: item.glucose, unit: 'mmol/L', occurredAt: at(item.day), source: 'patient-health-goal', sourceId: 'glucose-' + item.day },
      ];
    });
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
        activeGoals: [
          { id: 'sleep-goal', title: 'Sleep goal', category: 'SLEEP', status: 'ACTIVE', targetValue: 8, unit: 'hours/night' },
          { id: 'water-goal', title: 'Drink more water', category: 'HYDRATION', status: 'ACTIVE', targetValue: 2500, unit: 'mL/day' },
          { id: 'exercise-goal', title: 'Exercise', category: 'EXERCISE', status: 'ACTIVE', targetValue: 2500, unit: 'minutes/week' },
          { id: 'smoking-goal', title: 'Stop smoking', category: 'SMOKING', status: 'ACTIVE', targetValue: 7, unit: 'cigarettes/day' },
        ],
      },
      goalMetricEvents,
    });

    const result = service.analyze(report, 'patient-1');
    const routine = result.findings.find((item) => item.key === 'routine:combined-weekly-pattern');
    const diabetes = result.findings.find((item) => item.key === 'condition-context:diabetes-glucose');

    expect(routine).toBeDefined();
    expect(routine?.title).toContain('mixed pattern');
    expect(routine?.pattern).toContain('Sleep');
    expect(routine?.pattern).toContain('Water intake');
    expect(routine?.personalContext).toContain('Drink more water');
    expect(routine?.nextStep).toContain('saved goals');
    expect(diabetes).toBeDefined();
    expect(diabetes?.title).toContain('no numeric HbA1c result');
    expect(diabetes?.change).toContain('4 dated glucose');
    expect(diabetes?.whyItMatters).toContain('cannot infer longer-term diabetes control');
    expect(diabetes?.nextStep).toContain('HbA1c test is due');
  });

  it('does not calculate a trend from safety-flagged readings', () => {
    const base = fixture();
    const report = fixture({
      activity: {
        ...base.activity,
        patientVitals: [
          { id: 'o2-1', source: 'PATIENT', recordedAt: '2026-10-13T08:00:00.000Z', oxygenSaturation: 99 },
          { id: 'o2-2', source: 'PATIENT', recordedAt: '2026-10-14T08:00:00.000Z', oxygenSaturation: 98 },
          { id: 'o2-3', source: 'PATIENT', recordedAt: '2026-10-16T08:00:00.000Z', oxygenSaturation: 70 },
          { id: 'o2-4', source: 'PATIENT', recordedAt: '2026-10-17T08:00:00.000Z', oxygenSaturation: 70 },
        ],
      },
    });
    const result = service.analyze(report, 'patient-1');
    expect(result.coverage.safetySignalCount).toBeGreaterThan(0);
    expect(result.withinPeriodTrends.some((item) => item.metric === 'oxygen_saturation')).toBe(false);
  });

  it('does not infer a within-period trend from fewer than four dated days', () => {
    const base = fixture();
    const report = fixture({
      goalMetricEvents: [
        { metricType: 'BLOOD_GLUCOSE', metricKey: 'blood_glucose', loggedValue: 5.0, unit: 'mmol/L', occurredAt: '2026-10-13T08:00:00.000Z', source: 'patient-health-goal', sourceId: 'glucose-a' },
        { metricType: 'BLOOD_GLUCOSE', metricKey: 'blood_glucose', loggedValue: 5.2, unit: 'mmol/L', occurredAt: '2026-10-14T08:00:00.000Z', source: 'patient-health-goal', sourceId: 'glucose-b' },
        { metricType: 'BLOOD_GLUCOSE', metricKey: 'blood_glucose', loggedValue: 6.2, unit: 'mmol/L', occurredAt: '2026-10-17T08:00:00.000Z', source: 'patient-health-goal', sourceId: 'glucose-c' },
      ],
      currentSnapshot: { ...base.currentSnapshot, conditions: [{ id: 'diabetes', name: 'Diabetes', status: 'ACTIVE' }] },
    });
    const result = service.analyze(report, 'patient-1');
    expect(result.withinPeriodTrends.some((item) => item.metric === 'blood_glucose')).toBe(false);
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
        profile: { smokingStatus: 'NEVER' },
        immunizations: [{
          id: 'immunization-1',
          status: 'MISSED',
          nextDueDate: '2026-10-18T08:00:00.000Z',
          immunization: { name: 'Flu vaccine' },
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
      goalMetricEvents: [{
        metricType: 'SMOKING',
        metricKey: 'smoking.cigarettes',
        loggedValue: 4,
        unit: 'cigarettes',
        occurredAt: '2026-10-14T08:00:00.000Z',
        source: 'patient-smoking-log',
        sourceId: 'smoking-event-1',
      }],
    });

    const result = service.analyze(report, 'patient-1');
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'ALLERGY' && item.headline.includes('Penicillin'))).toBe(true);
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'TREATMENT' && item.headline.includes('Amoxicillin'))).toBe(true);
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'PROFILE' && item.headline.includes('4 cigarettes'))).toBe(true);
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'PROFILE' && item.status === 'WATCH' && item.detail.includes('may reflect a change'))).toBe(true);
    expect(result.personalisedContext.insights.some((item) =>
      item.group === 'PREVENTIVE_CARE' && item.headline.toLowerCase().includes('missed'))).toBe(true);
  });

  it('detects a meaningful within-period change and relates it to saved diabetes and glucose-goal context', () => {
    const base = fixture();
    const glucoseEvents = [
      { day: '2026-10-13', value: 5.0 },
      { day: '2026-10-14', value: 5.2 },
      { day: '2026-10-16', value: 6.0 },
      { day: '2026-10-17', value: 6.2 },
    ].map((item) => ({
      metricType: 'BLOOD_GLUCOSE',
      metricKey: 'blood_glucose',
      loggedValue: item.value,
      unit: 'mmol/L',
      occurredAt: item.day + 'T08:00:00.000Z',
      source: 'patient-health-goal',
      sourceId: 'glucose-' + item.day,
    }));
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
        activeGoals: [{
          id: 'goal-glucose',
          title: 'Blood glucose goal',
          category: 'BLOOD_GLUCOSE',
          status: 'ACTIVE',
          targetValue: 6,
          unit: 'mmol/L',
        }],
      },
      goalMetricEvents: glucoseEvents,
    });

    const result = service.analyze(report, 'patient-1');
    const trend = result.withinPeriodTrends.find((item) => item.metric === 'blood_glucose');

    expect(trend).toBeDefined();
    expect(trend?.direction).toBe('RISING');
    expect(trend?.earlierAverage).toBe(5.1);
    expect(trend?.laterAverage).toBe(6.1);
    expect(trend?.relatedConditions).toContain('Diabetes');
    expect(trend?.relatedGoals).toContain('Blood glucose goal');
    expect(trend?.interpretation).toContain('clinician-set targets');
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

  it('compares matched prior-period evidence and turns a supported change into a narrative finding', () => {
    const base = fixture();
    const glucoseEvents = [
      { day: '2026-10-13', value: 5.0 },
      { day: '2026-10-14', value: 5.2 },
    ].map((item) => ({
      metricType: 'BLOOD_GLUCOSE',
      metricKey: 'blood_glucose',
      loggedValue: item.value,
      unit: 'mmol/L',
      occurredAt: item.day + 'T08:00:00.000Z',
      source: 'patient-health-goal',
      sourceId: 'current-glucose-' + item.day,
    }));
    const priorEvents = [
      { day: '2026-10-06', value: 4.0 },
      { day: '2026-10-08', value: 4.2 },
    ].map((item) => ({
      metricType: 'BLOOD_GLUCOSE',
      metricKey: 'blood_glucose',
      loggedValue: item.value,
      unit: 'mmol/L',
      occurredAt: item.day + 'T08:00:00.000Z',
      source: 'patient-health-goal',
      sourceId: 'prior-glucose-' + item.day,
    }));
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
        activeGoals: [{
          id: 'goal-glucose',
          title: 'Blood glucose goal',
          category: 'BLOOD_GLUCOSE',
          status: 'ACTIVE',
          targetValue: 6,
          unit: 'mmol/L',
        }],
      },
      goalMetricEvents: glucoseEvents,
      longitudinal: {
        period: {
          start: '2026-10-05T22:00:00.000Z',
          end: '2026-10-12T22:00:00.000Z',
        },
        activity: {
          journalEntries: [], symptoms: [], deviceMeasurements: [],
          wellnessMetrics: [], sleepSessions: [], workouts: [],
        },
        clinical: { vitals: [], labResults: [] },
        goalMetricEvents: priorEvents,
      },
    });

    const result = service.analyze(report, 'patient-1');
    const comparison = result.periodComparisons.find((item) => item.metric === 'blood_glucose');
    const finding = result.findings.find((item) => item.key === 'comparison:blood_glucose');

    expect(comparison).toBeDefined();
    expect(comparison?.previousAverage).toBe(4.1);
    expect(comparison?.currentAverage).toBe(5.1);
    expect(comparison?.relatedConditions).toContain('Diabetes');
    expect(comparison?.relatedGoals).toContain('Blood glucose goal');
    expect(comparison?.relatedGoalTargets).toContain(
      'Blood glucose goal: saved target 6 mmol/L; current average 5.1 mmol/L is 0.9 mmol/L below the saved target value; previous-period average 4.1 mmol/L was 1.9 mmol/L below the saved target value. This is a numeric comparison only, not a pass/fail judgement.',
    );
    expect(comparison?.interpretation).toContain('does not supply a universal pass/fail rule');
    expect(finding).toBeDefined();
    expect(finding?.priority).toBe('WATCH');
    expect(finding?.personalContext).toContain('Diabetes');
    expect(finding?.evidence).toHaveLength(2);
  });

  it('puts same-record symptom worsening into the prioritised narrative', () => {
    const base = fixture();
    const report = fixture({
      activity: {
        ...base.activity,
        symptoms: [{
          id: 'symptom-headache',
          title: 'Headache',
          startedAt: '2026-10-13T08:00:00.000Z',
          overallSeverity: 'MILD',
          monitorings: [{
            id: 'headache-follow-up',
            severity: 'SEVERE',
            observedAt: '2026-10-17T08:00:00.000Z',
          }],
        }],
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'symptom-worsening:symptom-headache');

    expect(finding).toBeDefined();
    expect(finding?.priority).toBe('REVIEW');
    expect(finding?.change).toContain('mild to severe');
    expect(finding?.evidence).toHaveLength(2);
  });

  it('compares newly started recurring symptoms without treating follow-up edits as new symptoms', () => {
    const base = fixture();
    const currentSymptoms = [
      { id: 'headache-current-1', title: 'Headache', startedAt: '2026-10-13T08:00:00.000Z', overallSeverity: 'MILD', monitorings: [] },
      { id: 'headache-current-2', title: 'Headache', startedAt: '2026-10-16T08:00:00.000Z', overallSeverity: 'MODERATE', monitorings: [] },
    ];
    const report = fixture({
      activity: { ...base.activity, symptoms: currentSymptoms },
      longitudinal: {
        period: { start: '2026-10-05T22:00:00.000Z', end: '2026-10-12T22:00:00.000Z' },
        activity: {
          journalEntries: [],
          symptoms: [{ id: 'headache-prior-1', title: 'Headache', startedAt: '2026-10-07T08:00:00.000Z', overallSeverity: 'MILD', monitorings: [] }],
          deviceMeasurements: [],
          wellnessMetrics: [],
          sleepSessions: [],
          workouts: [],
        },
        clinical: { vitals: [], labResults: [] },
        goalMetricEvents: [],
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'symptom-frequency:headache');

    expect(finding).toBeDefined();
    expect(finding?.change).toContain('2 newly-started symptom record(s)');
    expect(finding?.change).toContain('versus 1');
    expect(finding?.personalContext).toContain('increased symptoms or more consistent logging');
  });

  it('explains explicitly dated Health Passport changes without treating them as proof of clinical resolution', () => {
    const base = fixture();
    const report = fixture({
      tracking: {
        ...base.tracking,
        healthPassportChanges: {
          conditions: [{
            id: 'condition-change-1',
            name: 'Asthma',
            status: 'RESOLVED',
            resolvedAt: '2026-10-15T08:00:00.000Z',
            createdAt: '2026-10-15T08:00:00.000Z',
          }],
          medications: [{
            id: 'med-change-1',
            medication: { name: 'Example medicine' },
            status: 'DISCONTINUED',
            endedAt: '2026-10-16T08:00:00.000Z',
            createdAt: '2026-10-10T08:00:00.000Z',
          }],
        },
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'context:health-record-changes');

    expect(finding).toBeDefined();
    expect(finding?.pattern).toContain('Asthma — marked resolved');
    expect(finding?.pattern).toContain('Example medicine — end date recorded');
    expect(finding?.whyItMatters).toContain('not proof that all symptoms have ended');
  });


  it('finds a supported longer-term shift within the 90-day evidence window', () => {
    const base = fixture();
    const longTermEvents = [
      { day: '2026-07-20', value: 4.0 },
      { day: '2026-08-01', value: 4.1 },
      { day: '2026-08-14', value: 4.2 },
      { day: '2026-09-05', value: 6.0 },
      { day: '2026-09-21', value: 6.1 },
      { day: '2026-10-03', value: 6.2 },
    ].map((item) => ({
      metricType: 'BLOOD_GLUCOSE',
      metricKey: 'blood_glucose',
      loggedValue: item.value,
      unit: 'mmol/L',
      occurredAt: item.day + 'T08:00:00.000Z',
      source: 'patient-health-goal',
      sourceId: 'long-term-glucose-' + item.day,
    }));
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
      },
      longitudinal: {
        historyStart: '2026-07-14T22:00:00.000Z',
        period: {
          start: '2026-10-05T22:00:00.000Z',
          end: '2026-10-12T22:00:00.000Z',
        },
        activity: {
          journalEntries: [], symptoms: [], deviceMeasurements: [],
          wellnessMetrics: [], sleepSessions: [], workouts: [],
        },
        clinical: { vitals: [], labResults: [] },
        goalMetricEvents: longTermEvents,
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'long-term:blood_glucose');

    expect(finding).toBeDefined();
    expect(finding?.title).toContain('longer-term shift');
    expect(finding?.change).toContain('4.1 mmol/L');
    expect(finding?.change).toContain('6.1 mmol/L');
    expect(finding?.personalContext).toContain('Diabetes');
    expect(finding?.evidence.length).toBeGreaterThanOrEqual(2);
  });


  it('connects saved medication indications, reported medicine effects and allergy mentions without claiming causation', () => {
    const base = fixture();
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        conditions: [{ id: 'condition-diabetes', name: 'Diabetes', status: 'ACTIVE' }],
        medications: [{
          id: 'patient-med-metformin',
          status: 'ACTIVE',
          ongoing: true,
          indication: 'Type 2 diabetes management',
          medication: { name: 'Metformin', genericName: 'Metformin' },
        }],
        allergies: [{
          id: 'patient-allergy-penicillin',
          status: 'ACTIVE',
          allergy: { name: 'Penicillin' },
        }],
      },
      activity: {
        ...base.activity,
        symptoms: [{
          id: 'symptom-rash-nausea',
          title: 'Rash and nausea',
          startedAt: '2026-10-14T08:00:00.000Z',
          overallSeverity: 'MILD',
          triggers: [{ trigger: 'Possible Penicillin exposure' }],
          medicationEffects: [{
            id: 'effect-metformin-1',
            reportedMedicationName: 'Metformin',
            sideEffects: 'Nausea reported after dose',
          }],
        }],
      },
    });

    const result = service.analyze(report, 'patient-1');
    const indication = result.findings.find((item) => item.key === 'medication-indication:patient-med-metformin');
    const medicineEffect = result.findings.find((item) => item.key === 'medication-effect:metformin');
    const allergy = result.findings.find((item) => item.key === 'allergy-context:penicillin');

    expect(indication).toBeDefined();
    expect(indication?.personalContext).toContain('Diabetes');
    expect(medicineEffect).toBeDefined();
    expect(medicineEffect?.pattern).toContain('Nausea reported after dose');
    expect(medicineEffect?.whyItMatters).toContain('do not establish that the medicine caused');
    expect(allergy).toBeDefined();
    expect(allergy?.whyItMatters).toContain('cannot verify an allergic reaction or its cause');
  });


  it('connects repeated symptom dates with explicit skipped-dose dates without claiming causation', () => {
    const base = fixture();
    const report = fixture({
      currentSnapshot: {
        ...base.currentSnapshot,
        medications: [{
          id: 'patient-medication-1',
          status: 'ACTIVE',
          ongoing: true,
          medication: { name: 'Example medicine', genericName: 'Example medicine' },
        }],
      },
      activity: {
        ...base.activity,
        symptoms: [
          { id: 'symptom-a', title: 'Headache', startedAt: '2026-10-13T08:00:00.000Z', overallSeverity: 'MILD', monitorings: [] },
          { id: 'symptom-b', title: 'Nausea', startedAt: '2026-10-14T08:00:00.000Z', overallSeverity: 'MILD', monitorings: [] },
        ],
      },
      goalMetricEvents: [
        {
          metricType: 'MEDICATION', metricKey: 'medication.adherence', loggedValue: 0,
          occurredAt: '2026-10-13T09:00:00.000Z', source: 'medication-adherence',
          sourceId: 'patient-medication-1:action-1', metadata: { action: 'SKIPPED', patientMedicationId: 'patient-medication-1' },
        },
        {
          metricType: 'MEDICATION', metricKey: 'medication.adherence', loggedValue: 0,
          occurredAt: '2026-10-14T09:00:00.000Z', source: 'medication-adherence',
          sourceId: 'patient-medication-1:action-2', metadata: { action: 'SKIPPED', patientMedicationId: 'patient-medication-1' },
        },
      ],
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'cross:symptoms-medication-actions');

    expect(finding).toBeDefined();
    expect(finding?.change).toContain('2 separate day(s)');
    expect(finding?.pattern).toContain('Example medicine');
    expect(finding?.whyItMatters).toContain('does not show that skipped doses caused symptoms');
    expect(finding?.nextStep).toContain('do not change or double a dose');
  });


  it('turns repeated low mood check-ins into a contextual finding with a next step', () => {
    const report = fixture({
      activity: {
        ...fixture().activity,
        journalEntries: [
          { id: 'mood-1', title: 'Daily Health Check-in', createdAt: '2026-10-13T08:00:00.000Z', mood: 'BAD' },
          { id: 'mood-2', title: 'Daily Health Check-in', createdAt: '2026-10-14T08:00:00.000Z', mood: 'VERY_BAD' },
          { id: 'mood-3', title: 'Daily Health Check-in', createdAt: '2026-10-15T08:00:00.000Z', mood: 'NEUTRAL' },
          { id: 'mood-4', title: 'Daily Health Check-in', createdAt: '2026-10-16T08:00:00.000Z', mood: 'GOOD' },
        ],
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'wellbeing:repeated-low-mood');
    expect(finding).toBeDefined();
    expect(finding?.priority).toBe('WATCH');
    expect(finding?.change).toContain('2 of 4 mood check-ins (50%)');
    expect(finding?.personalContext).toContain('own dated mood check-ins');
    expect(finding?.nextStep).toContain('talk with someone you trust or a health professional');
    expect(finding?.sourceRecordIds).toEqual(['mood-1', 'mood-2']);
  });


  it('surfaces saved risk-assessment classifications and scores without inventing a universal score', () => {
    const report = fixture({
      tracking: {
        ...fixture().tracking,
        riskAssessments: [{
          id: 'risk-assessment-1',
          assessmentType: 'Cardiovascular risk assessment',
          overallRisk: 'HIGH',
          score: 18,
          assessedAt: '2026-10-15T08:00:00.000Z',
          notes: 'Source assessment notes',
          results: [{
            factor: 'Blood pressure',
            value: 'Elevated',
            recommendation: 'Review with clinician',
          }],
        }],
      },
    });

    const result = service.analyze(report, 'patient-1');
    const finding = result.findings.find((item) => item.key === 'risk-assessment:risk-assessment-1');
    expect(finding).toBeDefined();
    expect(finding?.priority).toBe('REVIEW');
    expect(finding?.change).toContain('Source risk classification: HIGH.');
    expect(finding?.change).toContain('Recorded score: 18.');
    expect(finding?.personalContext).toBe('Source assessment notes');
    expect(finding?.nextStep).toContain('original assessment');
    expect(finding?.sourceRecordIds).toEqual(['risk-assessment-1']);
  });

});
