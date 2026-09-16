import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  ADDITIONAL_ALLERGIES,
  ADDITIONAL_CONDITIONS,
  MEDICATION_CLINICAL_REFERENCE,
  SYMPTOM_REFERENCE,
} from './clinical-reference-data';
import { MEDICATION_MASK_REFERENCE } from './medication-mask-reference';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function findMedication(name: string) {
  const medications = await prisma.medication.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const wanted = normalise(name);
  return (
    medications.find((medication) => normalise(medication.name) === wanted) ??
    medications.find((medication) => normalise(medication.name).includes(wanted))
  );
}

async function findOrCreateSymptom(name: string) {
  const existing = await prisma.symptom.findFirst({ where: { name } });
  if (existing) return existing;

  const reference = SYMPTOM_REFERENCE.find(
    (symptom) => normalise(symptom.name) === normalise(name),
  );

  return prisma.symptom.create({
    data: {
      name,
      category: reference?.category ?? 'General',
      bodySystem: reference?.category ?? 'General',
      description: reference?.synonyms?.length
        ? `Also known as: ${reference.synonyms.join(', ')}`
        : undefined,
      searchable: true,
      active: true,
    },
  });
}

async function upsertRelationship(
  medicationId: string,
  symptomName: string,
  relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM' | 'MAY_MASK_SYMPTOM',
  source?: string,
  notes?: string,
) {
  const symptom = await findOrCreateSymptom(symptomName);

  await prisma.medicationClinicalReference.upsert({
    where: {
      medicationId_symptomId_relationType: {
        medicationId,
        symptomId: symptom.id,
        relationType,
      },
    },
    update: {
      evidenceLevel: 'CURATED',
      ...(source ? { source } : {}),
      ...(notes ? { notes } : {}),
      active: true,
    },
    create: {
      medicationId,
      symptomId: symptom.id,
      relationType,
      evidenceLevel: 'CURATED',
      ...(source ? { source } : {}),
      ...(notes ? { notes } : {}),
      active: true,
    },
  });

  return symptom;
}

async function main() {
  for (const name of ADDITIONAL_CONDITIONS) {
    const existing = await prisma.condition.findFirst({ where: { name } });
    if (existing) {
      await prisma.condition.update({
        where: { id: existing.id },
        data: { searchable: true, active: true },
      });
    } else {
      await prisma.condition.create({
        data: { name, searchable: true, active: true },
      });
    }
  }

  for (const name of ADDITIONAL_ALLERGIES) {
    const existing = await prisma.allergy.findFirst({ where: { name } });
    if (existing) {
      await prisma.allergy.update({
        where: { id: existing.id },
        data: { searchable: true, active: true },
      });
    } else {
      await prisma.allergy.create({
        data: { name, searchable: true, active: true },
      });
    }
  }

  for (const symptom of SYMPTOM_REFERENCE) {
    const description = symptom.synonyms?.length
      ? `Also known as: ${symptom.synonyms.join(', ')}`
      : undefined;

    const existing = await prisma.symptom.findFirst({
      where: { name: symptom.name },
    });

    if (existing) {
      await prisma.symptom.update({
        where: { id: existing.id },
        data: {
          category: symptom.category,
          bodySystem: symptom.category,
          description,
          searchable: true,
          active: true,
        },
      });
    } else {
      await prisma.symptom.create({
        data: {
          name: symptom.name,
          category: symptom.category,
          bodySystem: symptom.category,
          description,
          searchable: true,
          active: true,
        },
      });
    }
  }

  const medicationResults = [];

  for (const [medicationName, reference] of Object.entries(
    MEDICATION_CLINICAL_REFERENCE,
  )) {
    const medication = await findMedication(medicationName);

    if (!medication) {
      throw new Error(
        `Medication clinical reference cannot be seeded because medication "${medicationName}" was not found in the Medication table.`,
      );
    }

    let sideEffects = 0;
    let relieved = 0;

    for (const symptomName of reference.sideEffects) {
      await upsertRelationship(
        medication.id,
        symptomName,
        'SIDE_EFFECT',
      );
      sideEffects++;
    }

    for (const symptomName of reference.relieves) {
      await upsertRelationship(
        medication.id,
        symptomName,
        'RELIEVES_SYMPTOM',
      );
      relieved++;
    }

    medicationResults.push(
      `${medication.name}: ${sideEffects} side effects, ${relieved} relieved symptoms`,
    );
  }

  for (const [medicationName, symptomNames] of Object.entries(
    MEDICATION_MASK_REFERENCE,
  )) {
    const medication = await findMedication(medicationName);

    if (!medication) {
      throw new Error(
        `Medication masking reference cannot be seeded because medication "${medicationName}" was not found in the Medication table.`,
      );
    }

    for (const symptomName of symptomNames) {
      await upsertRelationship(
        medication.id,
        symptomName,
        'MAY_MASK_SYMPTOM',
        'DailyMed',
        'The antipyretic effect may mask fever.',
      );
    }
  }

  console.log(
    `Clinical reference seeded: ${SYMPTOM_REFERENCE.length} symptoms, ${ADDITIONAL_CONDITIONS.length} additional conditions, ${ADDITIONAL_ALLERGIES.length} additional allergies.`,
  );
  console.log('Medication clinical reference:');
  for (const result of medicationResults) console.log(`  ${result}`);
}

main()
  .catch((error) => {
    console.error('Clinical reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
