import type { PrismaClient } from '@prisma/client';

/**
 * Sympto medication master reference.
 *
 * Medication identity is kept separate from formulation. A medication can have
 * multiple strengths, dosage forms and routes, and the patient selects a
 * formulation rather than being asked to invent route/strength information.
 *
 * This is the curated patient-facing reference catalogue. Clinical side effects,
 * symptom indications and masking relationships are enriched separately from
 * authoritative labeling/reference sources.
 */
export const MEDICATION_REFERENCE = [
  // Analgesics / anti-inflammatory
  { name: 'Aspirin', genericName: 'Acetylsalicylic acid', category: 'ANALGESIC', strengths: [
    { strength: '75 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '81 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '100 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '300 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Paracetamol', genericName: 'Paracetamol', category: 'ANALGESIC', strengths: [
    { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '1 g', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '120 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' }, { strength: '250 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
  ] },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'NSAID', strengths: [
    { strength: '200 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '400 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '100 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
  ] },
  { name: 'Naproxen', genericName: 'Naproxen', category: 'NSAID', strengths: [
    { strength: '250 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Diclofenac', genericName: 'Diclofenac', category: 'NSAID', strengths: [
    { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '50 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '1%', dosageForm: 'Gel', route: 'TOPICAL' },
  ] },
  { name: 'Ketorolac', genericName: 'Ketorolac', category: 'NSAID', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '30 mg/mL', dosageForm: 'Injection', route: 'INJECTION' },
  ] },

  // Antibiotics / antimicrobials
  { name: 'Amoxicillin', genericName: 'Amoxicillin', category: 'ANTIBIOTIC', strengths: [
    { strength: '250 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '250 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
  ] },
  { name: 'Amoxicillin/clavulanate', genericName: 'Amoxicillin/clavulanic acid', category: 'ANTIBIOTIC', strengths: [
    { strength: '500 mg/125 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '875 mg/125 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '400 mg/57 mg per 5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
  ] },
  { name: 'Azithromycin', genericName: 'Azithromycin', category: 'ANTIBIOTIC', strengths: [
    { strength: '250 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '200 mg/5 mL', dosageForm: 'Oral suspension', route: 'ORAL' },
  ] },
  { name: 'Doxycycline', genericName: 'Doxycycline', category: 'ANTIBIOTIC', strengths: [
    { strength: '100 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
  { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', category: 'ANTIBIOTIC', strengths: [
    { strength: '250 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Metronidazole', genericName: 'Metronidazole', category: 'ANTIBIOTIC', strengths: [
    { strength: '200 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '400 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Cephalexin', genericName: 'Cephalexin', category: 'ANTIBIOTIC', strengths: [
    { strength: '250 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '500 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },

  // Diabetes / endocrine
  { name: 'Metformin', genericName: 'Metformin', category: 'ANTIDIABETIC', strengths: [
    { strength: '500 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '850 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '1000 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Gliclazide', genericName: 'Gliclazide', category: 'ANTIDIABETIC', strengths: [
    { strength: '30 mg', dosageForm: 'Modified-release tablet', route: 'ORAL' }, { strength: '80 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Glimepiride', genericName: 'Glimepiride', category: 'ANTIDIABETIC', strengths: [
    { strength: '1 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '2 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '4 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Empagliflozin', genericName: 'Empagliflozin', category: 'ANTIDIABETIC', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Insulin', genericName: 'Human insulin', category: 'ANTIDIABETIC', strengths: [
    { strength: '100 units/mL', dosageForm: 'Injection', route: 'SUBCUTANEOUS' },
  ] },
  { name: 'Levothyroxine', genericName: 'Levothyroxine', category: 'THYROID', strengths: [
    { strength: '25 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '50 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '75 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '100 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '125 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '150 mcg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Carbimazole', genericName: 'Carbimazole', category: 'THYROID', strengths: [
    { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },

  // Cardiovascular
  { name: 'Amlodipine', genericName: 'Amlodipine', category: 'ANTIHYPERTENSIVE', strengths: [
    { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Losartan', genericName: 'Losartan', category: 'ANTIHYPERTENSIVE', strengths: [
    { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '50 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '100 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Lisinopril', genericName: 'Lisinopril', category: 'ANTIHYPERTENSIVE', strengths: [
    { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Enalapril', genericName: 'Enalapril', category: 'ANTIHYPERTENSIVE', strengths: [
    { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', category: 'DIURETIC', strengths: [
    { strength: '12.5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Furosemide', genericName: 'Furosemide', category: 'DIURETIC', strengths: [
    { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Bisoprolol', genericName: 'Bisoprolol', category: 'BETA-BLOCKER', strengths: [
    { strength: '2.5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Propranolol', genericName: 'Propranolol', category: 'BETA-BLOCKER', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Atorvastatin', genericName: 'Atorvastatin', category: 'LIPID-LOWERING', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '80 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Simvastatin', genericName: 'Simvastatin', category: 'LIPID-LOWERING', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },

  // Respiratory / allergy
  { name: 'Salbutamol', genericName: 'Salbutamol', category: 'BRONCHODILATOR', strengths: [
    { strength: '100 mcg/dose', dosageForm: 'Metered-dose inhaler', route: 'INHALATION' }, { strength: '2 mg/5 mL', dosageForm: 'Oral solution', route: 'ORAL' },
  ] },
  { name: 'Budesonide', genericName: 'Budesonide', category: 'CORTICOSTEROID', strengths: [
    { strength: '200 mcg/dose', dosageForm: 'Inhaler', route: 'INHALATION' }, { strength: '400 mcg/dose', dosageForm: 'Inhaler', route: 'INHALATION' },
  ] },
  { name: 'Beclometasone', genericName: 'Beclometasone', category: 'CORTICOSTEROID', strengths: [
    { strength: '50 mcg/dose', dosageForm: 'Inhaler', route: 'INHALATION' }, { strength: '100 mcg/dose', dosageForm: 'Inhaler', route: 'INHALATION' },
  ] },
  { name: 'Cetirizine', genericName: 'Cetirizine', category: 'ANTIHISTAMINE', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '5 mg/5 mL', dosageForm: 'Oral solution', route: 'ORAL' },
  ] },
  { name: 'Loratadine', genericName: 'Loratadine', category: 'ANTIHISTAMINE', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },

  // Gastrointestinal
  { name: 'Omeprazole', genericName: 'Omeprazole', category: 'GASTROINTESTINAL', strengths: [
    { strength: '20 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
  { name: 'Pantoprazole', genericName: 'Pantoprazole', category: 'GASTROINTESTINAL', strengths: [
    { strength: '20 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '40 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Loperamide', genericName: 'Loperamide', category: 'ANTIDIARRHEAL', strengths: [
    { strength: '2 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
  { name: 'Ondansetron', genericName: 'Ondansetron', category: 'ANTIEMETIC', strengths: [
    { strength: '4 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '8 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Metoclopramide', genericName: 'Metoclopramide', category: 'ANTIEMETIC', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },

  // Mental health / neurology
  { name: 'Fluoxetine', genericName: 'Fluoxetine', category: 'ANTIDEPRESSANT', strengths: [
    { strength: '20 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
  { name: 'Sertraline', genericName: 'Sertraline', category: 'ANTIDEPRESSANT', strengths: [
    { strength: '50 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '100 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Amitriptyline', genericName: 'Amitriptyline', category: 'ANTIDEPRESSANT', strengths: [
    { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '25 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Diazepam', genericName: 'Diazepam', category: 'ANXIOLYTIC', strengths: [
    { strength: '2 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '10 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Gabapentin', genericName: 'Gabapentin', category: 'NEUROLOGICAL', strengths: [
    { strength: '100 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '300 mg', dosageForm: 'Capsule', route: 'ORAL' }, { strength: '400 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },

  // Dermatology
  { name: 'Benzoyl peroxide', genericName: 'Benzoyl peroxide', category: 'DERMATOLOGY', strengths: [
    { strength: '2.5%', dosageForm: 'Gel', route: 'TOPICAL' }, { strength: '5%', dosageForm: 'Gel', route: 'TOPICAL' }, { strength: '10%', dosageForm: 'Gel', route: 'TOPICAL' },
  ] },
  { name: 'Hydrocortisone', genericName: 'Hydrocortisone', category: 'CORTICOSTEROID', strengths: [
    { strength: '1%', dosageForm: 'Cream', route: 'TOPICAL' },
  ] },
  { name: 'Clotrimazole', genericName: 'Clotrimazole', category: 'ANTIFUNGAL', strengths: [
    { strength: '1%', dosageForm: 'Cream', route: 'TOPICAL' },
  ] },

  // Urogenital / reproductive
  { name: 'Tamsulosin', genericName: 'Tamsulosin', category: 'UROLOGICAL', strengths: [
    { strength: '0.4 mg', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
  { name: 'Finasteride', genericName: 'Finasteride', category: 'UROLOGICAL', strengths: [
    { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Combined oral contraceptive', genericName: 'Ethinylestradiol/levonorgestrel', category: 'CONTRACEPTIVE', strengths: [
    { strength: '30 mcg/150 mcg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },

  // Common supplements / replacement therapies
  { name: 'Ferrous sulfate', genericName: 'Ferrous sulfate', category: 'MINERAL', strengths: [
    { strength: '200 mg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '300 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Folic acid', genericName: 'Folic acid', category: 'VITAMIN', strengths: [
    { strength: '400 mcg', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '5 mg', dosageForm: 'Tablet', route: 'ORAL' },
  ] },
  { name: 'Vitamin D3', genericName: 'Cholecalciferol', category: 'VITAMIN', strengths: [
    { strength: '1000 IU', dosageForm: 'Tablet', route: 'ORAL' }, { strength: '50000 IU', dosageForm: 'Capsule', route: 'ORAL' },
  ] },
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
