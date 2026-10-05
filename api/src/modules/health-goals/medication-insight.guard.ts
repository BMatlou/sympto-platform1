export class MedicationInsightSynchronizationError extends Error {
  constructor() {
    super(
      "Medication insight numerator is out of sync with the validated medication dose stream.",
    );
    this.name = "MedicationInsightSynchronizationError";
  }
}

export function medicationInsightNumeratorMismatch(
  sourceTakenCount: number,
  computedTakenCount: number,
): boolean {
  const sourceTaken = Number(sourceTakenCount);
  const computedTaken = Number(computedTakenCount);

  return (
    Number.isFinite(sourceTaken) &&
    Number.isFinite(computedTaken) &&
    sourceTaken > 0 &&
    computedTaken === 0
  );
}

export function assertMedicationInsightNumeratorSynchronized(
  sourceTakenCount: number,
  computedTakenCount: number,
): void {
  if (medicationInsightNumeratorMismatch(sourceTakenCount, computedTakenCount)) {
    throw new MedicationInsightSynchronizationError();
  }
}
