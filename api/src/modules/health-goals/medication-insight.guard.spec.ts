import {
  MedicationInsightSynchronizationError,
  assertMedicationInsightNumeratorSynchronized,
} from './medication-insight.guard';

describe('Medication insight numerator synchronization guard', () => {
  it('throws when the validated dose stream has taken doses but insight computes zero', () => {
    expect(() => assertMedicationInsightNumeratorSynchronized(18, 0)).toThrow(
      MedicationInsightSynchronizationError,
    );
  });

  it('does not throw when both values are zero', () => {
    expect(() => assertMedicationInsightNumeratorSynchronized(0, 0)).not.toThrow();
  });

  it('does not throw when the computed numerator agrees with the validated stream', () => {
    expect(() => assertMedicationInsightNumeratorSynchronized(18, 18)).not.toThrow();
  });
});
