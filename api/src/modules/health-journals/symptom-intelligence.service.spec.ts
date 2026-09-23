import {
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

import { SymptomIntelligenceService } from './symptom-intelligence.service';

describe('SymptomIntelligenceService', () => {
  const service = new SymptomIntelligenceService(
    {} as any,
    {} as any,
    { understand: jest.fn().mockResolvedValue(null) } as any,
  );

  it('detects multiple urgent warning patterns from patient language', () => {
    const detect = (service as any).detectSafetySignals.bind(service);

    expect(detect('I have heavy pressure in my chest')).toContain(
      'Chest pain, pressure, tightness or heaviness',
    );
    expect(detect('I am struggling to breathe')).toContain(
      'Severe breathing difficulty',
    );
    expect(detect('my face is drooping and my speech is slurred')).toContain(
      'Stroke warning sign',
    );
    expect(detect('I passed out')).toContain(
      'Loss of consciousness or unresponsiveness',
    );
  });

  it('extracts a structured symptom draft without diagnosing', () => {
    const infer = (service as any).inferTalkDraft.bind(service);

    const draft = infer(
      'I have had a moderate headache since yesterday and it gets worse when I work.',
    );

    expect(draft.symptomName).toBe('Headache');
    expect(draft.severity).toBe(SymptomSeverity.MODERATE);
    expect(draft.onsetLabel).toBe('Yesterday');
    expect(draft.progression).toBe(SymptomProgression.WORSENING);
    expect(draft.followUpQuestion).toBe(
      'Is there anything that makes it better or worse?',
    );
  });

  it('keeps patient-reported symptom certainty separate from clinical confirmation', () => {
    const detect = (service as any).detectSafetySignals.bind(service);

    expect(detect('I had chest pain last year')).toContain(
      'Chest pain, pressure, tightness or heaviness',
    );
  });
});
