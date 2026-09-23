import { Injectable } from '@nestjs/common';
import { SymptomProgression, SymptomSeverity } from '@prisma/client';

export interface AIUnderstandingDraft {
  symptomName: string | null;
  severity: SymptomSeverity | null;
  onsetLabel:
    | 'Today'
    | 'Yesterday'
    | 'A few days ago'
    | 'More than a week ago'
    | 'I am not sure';
  progression: SymptomProgression | null;
  painScore: number | null;
  location: string | null;
  followUpQuestion: string | null;
}

export interface AILongitudinalInsight {
  summary: string;
  patterns: string[];
  associations: string[];
  medicationInsights: string[];
  dataGaps: string[];
  nextQuestions: string[];
}

@Injectable()
export class SymptomAiService {
  private readonly enabled =
    String(process.env.SYMPTO_AI_ENABLED ?? '').toLowerCase() === 'true';
  private readonly url = String(process.env.SYMPTO_AI_URL ?? '').trim();
  private readonly apiKey = String(process.env.SYMPTO_AI_API_KEY ?? '').trim();
  private readonly model = String(
    process.env.SYMPTO_AI_MODEL ?? 'health-symptom-understanding',
  ).trim();

  async understand(message: string): Promise<AIUnderstandingDraft | null> {
    if (!this.enabled || !this.url || !this.apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are Sympto symptom-structure extraction only. Do not diagnose, rank diseases, infer causes, or provide treatment advice. Extract only information explicitly stated by the user. Return JSON with keys symptomName, severity, onsetLabel, progression, painScore, location, followUpQuestion. severity must be MILD, MODERATE, SEVERE, or null. progression must be IMPROVING, STABLE, WORSENING, FLUCTUATING, or null. onsetLabel must be Today, Yesterday, A few days ago, More than a week ago, or I am not sure. painScore must be 0-10 or null. Ask at most one concise follow-up question for the most important missing symptom field.',
            },
            {
              role: 'user',
              content: message,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return null;

      const payload = await response.json() as any;
      const raw = payload?.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') return null;

      const parsed = JSON.parse(raw);
      const severity = this.enumValue(
        parsed?.severity,
        ['MILD', 'MODERATE', 'SEVERE'],
      ) as SymptomSeverity | null;
      const progression = this.enumValue(
        parsed?.progression,
        ['IMPROVING', 'STABLE', 'WORSENING', 'FLUCTUATING'],
      ) as SymptomProgression | null;
      const onsetValues = [
        'Today',
        'Yesterday',
        'A few days ago',
        'More than a week ago',
        'I am not sure',
      ] as const;

      const onsetLabel = onsetValues.includes(parsed?.onsetLabel)
        ? parsed.onsetLabel
        : 'I am not sure';

      const numericPain =
        Number.isInteger(parsed?.painScore) &&
        parsed.painScore >= 0 &&
        parsed.painScore <= 10
          ? Number(parsed.painScore)
          : null;

      return {
        symptomName:
          typeof parsed?.symptomName === 'string' &&
          parsed.symptomName.trim().length >= 2
            ? parsed.symptomName.trim().slice(0, 120)
            : null,
        severity,
        onsetLabel,
        progression,
        painScore: numericPain,
        location:
          typeof parsed?.location === 'string' && parsed.location.trim()
            ? parsed.location.trim().slice(0, 300)
            : null,
        followUpQuestion:
          typeof parsed?.followUpQuestion === 'string' &&
          parsed.followUpQuestion.trim()
            ? parsed.followUpQuestion.trim().slice(0, 240)
            : null,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async analyzeLongitudinalTimeline(input: {
    symptomName: string;
    baseline: {
      severity: string | null;
      startedAt: string;
      location: string | null;
      notes: string | null;
    };
    monitoring: Array<{
      observedAt: string;
      severity: string;
      progression: string | null;
      suspectedTrigger: string | null;
      aggravatingFactors: string | null;
      relievingFactors: string | null;
      notes: string | null;
    }>;
    medicationEffects: Array<{
      medication: string;
      improved: boolean | null;
      effectiveness: number | null;
      sideEffects: string | null;
    }>;
    connectedContext: {
      activeMedicationCount: number;
      activeConditionCount: number;
      activeGoalCount: number;
      recentVitals: Array<{ type: string; value: number; measuredAt: string }>;
    };
  }): Promise<AILongitudinalInsight | null> {
    if (!this.enabled || !this.url || !this.apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'You are Sympto longitudinal health-record analysis. Analyze only the structured patient data provided. Do not diagnose, name diseases as explanations, infer causation, recommend treatment, or claim that one health factor caused another. Identify only observable patterns, repeated co-occurrences, changes over time, medication response as reported by the patient, and important missing data. Clearly label patient-reported associations as reported or possible. Return JSON with summary, patterns, associations, medicationInsights, dataGaps, nextQuestions. Each list may contain at most 5 concise items. Do not invent facts.',
            },
            {
              role: 'user',
              content: JSON.stringify(input),
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) return null;

      const payload = await response.json() as any;
      const raw = payload?.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') return null;

      const parsed = JSON.parse(raw);
      const cleanList = (value: unknown) =>
        Array.isArray(value)
          ? value
              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
              .map((item) => item.trim().slice(0, 300))
              .slice(0, 5)
          : [];

      return {
        summary:
          typeof parsed?.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim().slice(0, 600)
            : 'Sympto found no additional longitudinal summary.',
        patterns: cleanList(parsed?.patterns),
        associations: cleanList(parsed?.associations),
        medicationInsights: cleanList(parsed?.medicationInsights),
        dataGaps: cleanList(parsed?.dataGaps),
        nextQuestions: cleanList(parsed?.nextQuestions),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private enumValue(value: unknown, allowed: string[]): string | null {
    return typeof value === 'string' && allowed.includes(value) ? value : null;
  }
}
