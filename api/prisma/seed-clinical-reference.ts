import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  ADDITIONAL_ALLERGIES,
  ADDITIONAL_CONDITIONS,
  MEDICATION_CLINICAL_REFERENCE,
  SYMPTOM_REFERENCE,
} from './clinical-reference-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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

  for (const [medicationName, reference] of Object.entries(
    MEDICATION_CLINICAL_REFERENCE,
  )) {
    const medication = await prisma.medication.findFirst({
      where: { name: medicationName },
    });

    if (!medication) continue;

    for (const symptomName of reference.sideEffects) {
      const symptom = await prisma.symptom.findFirst({
        where: { name: symptomName },
      });
      if (!symptom) continue;

      await prisma.medicationClinicalReference.upsert({
        where: {
          medicationId_symptomId_relationType: {
            medicationId: medication.id,
            symptomId: symptom.id,
            relationType: 'SIDE_EFFECT',
          },
        },
        update: {
          evidenceLevel: 'CURATED',
          active: true,
        },
        create: {
          medicationId: medication.id,
          symptomId: symptom.id,
          relationType: 'SIDE_EFFECT',
          evidenceLevel: 'CURATED',
          active: true,
        },
      });
    }

    for (const symptomName of reference.relieves) {
      const symptom = await prisma.symptom.findFirst({
        where: { name: symptomName },
      });
      if (!symptom) continue;

      await prisma.medicationClinicalReference.upsert({
        where: {
          medicationId_symptomId_relationType: {
            medicationId: medication.id,
            symptomId: symptom.id,
            relationType: 'RELIEVES_SYMPTOM',
          },
        },
        update: {
          evidenceLevel: 'CURATED',
          active: true,
        },
        create: {
          medicationId: medication.id,
          symptomId: symptom.id,
          relationType: 'RELIEVES_SYMPTOM',
          evidenceLevel: 'CURATED',
          active: true,
        },
      });
    }
  }

  console.log(
    `Clinical reference seeded: ${SYMPTOM_REFERENCE.length} symptoms, ${ADDITIONAL_CONDITIONS.length} additional conditions, ${ADDITIONAL_ALLERGIES.length} additional allergies.`,
  );
}

main()
  .catch((error) => {
    console.error('Clinical reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
