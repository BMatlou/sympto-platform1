import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const CURRENT_MEDICATION_REFERENCE = {
  Carbimazole: {
    sideEffects: [
      'Nausea',
      'Headache',
      'Rash',
      'Itching',
      'Joint pain',
      'Hair loss',
      'Loss of taste',
      'Shortness of breath',
      'Cough',
      'Reduced urine output',
    ],
    relieves: [],
  },
  'Benzoyl peroxide': {
    sideEffects: [
      'Red skin',
      'Dry skin',
      'Itching',
      'Peeling skin',
      'Burning pain',
      'Skin swelling',
    ],
    relieves: [],
  },
} as const;

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

  return prisma.symptom.create({
    data: {
      name,
      category: 'General',
      bodySystem: 'General',
      searchable: true,
      active: true,
    },
  });
}

async function upsertReference(
  medicationId: string,
  symptomName: string,
  relationType: 'SIDE_EFFECT' | 'RELIEVES_SYMPTOM',
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
      source: 'Clinical reference',
      active: true,
    },
    create: {
      medicationId,
      symptomId: symptom.id,
      relationType,
      evidenceLevel: 'CURATED',
      source: 'Clinical reference',
      active: true,
    },
  });
}

async function main() {
  for (const [medicationName, reference] of Object.entries(
    CURRENT_MEDICATION_REFERENCE,
  )) {
    const medication = await findMedication(medicationName);

    if (!medication) {
      throw new Error(
        `Current medication clinical reference cannot be seeded because "${medicationName}" was not found in the Medication table.`,
      );
    }

    for (const symptom of reference.sideEffects) {
      await upsertReference(medication.id, symptom, 'SIDE_EFFECT');
    }

    for (const symptom of reference.relieves) {
      await upsertReference(medication.id, symptom, 'RELIEVES_SYMPTOM');
    }

    console.log(
      `${medication.name}: ${reference.sideEffects.length} side effects, ${reference.relieves.length} relieved symptoms`,
    );
  }
}

main()
  .catch((error) => {
    console.error('Current medication clinical reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
