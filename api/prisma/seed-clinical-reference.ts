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

  // Keep the symptom vocabulary independent from diagnosis/condition data.
  // This reference table is intentionally lightweight and searchable.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "symptom_reference" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "category" TEXT NOT NULL,
      "synonyms" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "active" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

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
