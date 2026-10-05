export type MedicationAdherenceStreamEvent = {
  id: string;
  loggedValue: number;
  occurredAt: string;
  source: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type MedicationJourneyInsight = {
  takenDoses: number;
  expectedScheduledDoses: number;
  adherencePercent: number;
};

export type MedicationJourneyInsightParentState = {
  adherenceStream: MedicationAdherenceStreamEvent[];
  takenCount: number;
  expectedScheduledDoses: number;
};

/**
 * The journey insight is deliberately built from the parent card's already
 * validated cumulative taken count. The stream is accepted as lineage/source
 * context but is never re-fetched or re-counted by the insight builder.
 */
export function buildMedicationJourneyInsight(
  parent: MedicationJourneyInsightParentState,
): MedicationJourneyInsight | null {
  const expected = Number(parent.expectedScheduledDoses);
  if (!Number.isFinite(expected) || expected <= 0) return null;

  const taken = Math.max(0, Math.floor(Number(parent.takenCount) || 0));
  const adherencePercent = Number(((taken / expected) * 100).toFixed(2));

  return {
    takenDoses: taken,
    expectedScheduledDoses: expected,
    adherencePercent,
  };
}

export function medicationInsightNumeratorMismatch(
  parentTakenCount: number,
  insightTakenCount: number,
): boolean {
  const sourceTaken = Number(parentTakenCount);
  const computedTaken = Number(insightTakenCount);

  return (
    Number.isFinite(sourceTaken) &&
    Number.isFinite(computedTaken) &&
    sourceTaken > 0 &&
    computedTaken === 0
  );
}
