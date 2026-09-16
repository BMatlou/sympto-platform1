import type { PrismaClient } from '@prisma/client';

/**
 * Curated medication reference data used by Sympto's medication master.
 *
 * The Medication model stores identity/clinical metadata and MedicationStrength
 * stores the formulation-specific strength, dosage form and route. Keeping these
 * separate lets the patient experience derive route from the selected formulation
 * instead of asking the patient to repeat information the system already knows.
 *
 * This file is intentionally additive. Existing medication records are updated by
 * stable name and existing formulations are upserted by their attributes, so it is
 * safe to run as part of the normal Prisma seed process.
 */
export const MEDICATION_REFERENCE = [
  {
    name: 'Aspirin',
    genericName: 'Acetylsalicylic acid',
    category: 'ANALGESIC',
    strengths: [
      { strength: '75 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '81 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '100 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '300 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Paracetamol',
    genericName: 'Paracetamol',
    category: 'ANALGESIC',
    strengths: [
      { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '1 g', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '120 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
      { strength: '250 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
    ],
  },
  {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    category: 'NSAID',
    strengths: [
      { strength: '200 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '400 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '100 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
    ],
  },
  {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    category: 'ANTIBIOTIC',
    strengths: [
      { strength: '250 mg', dosageForm: 'Capsule', route: 'ORAL' },
      { strength: '500 mg', dosageForm: 'Capsule', route: 'ORAL' },
      { strength: '250 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
    ],
  },
  {
    name: 'Metformin',
    genericName: 'Metformin',
    category: 'ANTIDIABETIC',
    strengths: [
      { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '850 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '1000 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Atorvastatin',
    genericName: 'Atorvastatin',
    category: 'LIPID-LOWERING',
    strengths: [
      { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '80 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Amlodipine',
    genericName: 'Amlodipine',
    category: 'ANTIHYPERTENSIVE',
    strengths: [
      { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Losartan',
    genericName: 'Losartan',
    category: 'ANTIHYPERTENSIVE',
    strengths: [
      { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '50 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '100 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    category: 'ANTIHYPERTENSIVE',
    strengths: [
      { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Levothyroxine',
    genericName: 'Levothyroxine',
    category: 'THYROID',
    strengths: [
      { strength: '25 mcg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '50 mcg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '75 mcg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '100 mcg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '125 mcg', dosageForm: 'Tablet', route: 'ORAL' },
      { strength: '150 mcg', dosageForm: 'Tablet', route: 'ORAL' },
    ],
  },
  {
    name: 'Salbutamol',
    genericName: 'Salbutamol',
    category: 'BRONCHODILATOR',
    strengths: [
      { strength: '100 mcg/dose', dosageForm: 'Metered-dose inhaler', route: 'INHALATION' },
      { strength: '2 mg/5 mL', dosageForm: 'Oral solution', route: 'ORAL' },
    ],
  },
  {
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    category: 'GASTROINTESTINAL',
    strengths: [
      { strength: '20 mg', dosageForm: 'Capsule', route: 'ORAL' },
      { strength: '40 mg', dosageForm: 'Capsule', route: 'ORAL' },
    ],
  },
] as const;

export async function seedMedicationReference(prisma: PrismaClient) {
  for (const medication of MEDICATION_REFERENCE) {
    const existing = await prisma.medication.findFirst({
      where: { name: { equals: medication.name, mode: 'insensitive' } },
    });

    const record = existing
      ? await prisma.medication.update({
          where: { id: existing.id },
          data: {
            genericName: medication.genericName,
            category: medication.category,
            searchable: true,
            active: true,
          },
        })
      : await prisma.medication.create({
          data: {
            name: medication.name,
            genericName: medication.genericName,
            category: medication.category,
            prescriptionRequired: true,
            searchable: true,
            active: true,
          },
        });

    for (const formulation of medication.strengths) {
      const existingStrength = await prisma.medicationStrength.findFirst({
        where: {
          medicationId: record.id,
          strength: formulation.strength,
          dosageForm: formulation.dosageForm,
          route: formulation.route,
        },
      });

      if (existingStrength) {
        await prisma.medicationStrength.update({
          where: { id: existingStrength.id },
          data: { active: true },
        });
      } else {
        await prisma.medicationStrength.create({
          data: {
            medicationId: record.id,
            strength: formulation.strength,
            dosageForm: formulation.dosageForm,
            route: formulation.route,
            active: true,
          },
        });
      }
    }
  }
}
