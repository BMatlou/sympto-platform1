/**
 * Explicit medication-to-symptom masking relationships.
 *
 * Only relationships supported directly by a clinical reference should be
 * placed here. A symptom being relieved is not automatically a masking
 * relationship.
 */
export const MEDICATION_MASK_REFERENCE = {
  Paracetamol: ['Fever'],
} as const;
