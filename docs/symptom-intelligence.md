# Sympto symptom intelligence

## Symptom capture

The initial symptom flow stores a small baseline: symptom name, current severity, approximate start time, optional body location, and optional patient narrative.

Monitoring information is intentionally not required during first capture.

## Monitoring

Later updates are stored as `SymptomObservation` records linked to the original `SymptomLog`. This preserves a time series for severity, progression, frequency, duration, pain score, resolution, triggers, aggravating/relieving factors, notes, and medication response.

This structure lets Sympto analyse change over time without overwriting the original patient report.

## AI boundary

Safety detection is deterministic and runs before optional AI.

The optional AI adapter is enabled only when all three server settings are present:

```
SYMPTO_AI_ENABLED=true
SYMPTO_AI_URL=<OpenAI-compatible internal endpoint>
SYMPTO_AI_API_KEY=<server-side secret>
SYMPTO_AI_MODEL=<model name>
```

The adapter receives only the user's current message. It is used to structure the message into symptom fields and propose one missing follow-up question. It must not diagnose, assign disease probabilities, infer causation, or override safety decisions.

With AI disabled or unavailable, Sympto falls back to the local structured extraction rules so the core feature still works.

## Longitudinal intelligence

The next AI layer should use the stored symptom observation series plus permitted patient context to summarise trends, repeated associations, medication-response observations, and clinician-ready timelines. Those outputs should remain clearly labelled as observations or associations rather than diagnoses or proven causes.
