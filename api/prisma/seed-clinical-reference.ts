import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  ADDITIONAL_ALLERGIES,
  ADDITIONAL_CONDITIONS,
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
    await prisma.$executeRawUnsafe(
      `INSERT INTO "symptom_reference" ("id", "name", "category", "synonyms", "active")
       VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, TRUE)
       ON CONFLICT ("name") DO UPDATE
       SET "category" = EXCLUDED."category",
           "synonyms" = EXCLUDED."synonyms",
           "active" = TRUE,
           "updated_at" = NOW()`,
      symptom.name,
      symptom.category,
      JSON.stringify(symptom.synonyms ?? []),
    );
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
