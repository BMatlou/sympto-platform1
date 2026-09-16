# Medication reference data

The medication master uses `Medication` for identity/metadata and `MedicationStrength` for formulation-specific strength, dosage form and route.

The reference data is defined in `medication-reference.ts` and can be established against the configured database with the runner in `medication-reference-runner.ts`.

From `api/`, run the project's existing TypeScript runner (for example the same runner used by the project for Prisma scripts) against `prisma/medication-reference-runner.ts`.

The operation is idempotent: existing medication records are matched case-insensitively by name and existing formulations by medication + strength + dosage form + route.
