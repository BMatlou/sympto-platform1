import 'dotenv/config';

import fs from 'fs';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type SeedFormulation = {
  name: string;
  strength?: string;
  dosageForm: string;
  route: string;
};

function parseSeedFormulations(): SeedFormulation[] {
  const seedPath = path.resolve(process.cwd(), 'prisma/seed.ts');
  const source = fs.readFileSync(seedPath, 'utf8');

  const startMarker = 'const medications: SeedMedication[] = [';
  const start = source.indexOf(startMarker);
  const end = source.indexOf('];', start);

  if (start < 0 || end < 0) {
    throw new Error(
      'Could not locate the medication reference data in prisma/seed.ts.',
    );
  }

  const section = source.slice(start + startMarker.length, end);
  const formulations: SeedFormulation[] = [];

  // Medication reference entries are plain object literals in seed.ts.
  // Read the four fields that are authoritative for MedicationStrength.
  const objectPattern = /\{([\s\S]*?)\n\s*\},/g;

  for (const match of section.matchAll(objectPattern)) {
    const block = match[1];
    const name = block.match(/name:\s*'([^']+)'/)?.[1];
    const strength = block.match(/strength:\s*'([^']+)'/)?.[1];
    const dosageForm = block.match(/dosageForm:\s*'([^']+)'/)?.[1];
    const route = block.match(/route:\s*'([^']+)'/)?.[1];

    if (name && dosageForm && route) {
      formulations.push({
        name,
        strength,
        dosageForm,
        route,
      });
    }
  }

  if (!formulations.length) {
    throw new Error(
      'No medication formulations were found in prisma/seed.ts.',
    );
  }

  return formulations;
}

async function main() {
  const formulations = parseSeedFormulations();
  let created = 0;
  let restored = 0;
  let repaired = 0;
  let skipped = 0;

  for (const formulation of formulations) {
    const medication = await prisma.medication.findFirst({
      where: {
        name: {
          equals: formulation.name,
          mode: 'insensitive',
        },
      },
      orderBy: { active: 'desc' },
      select: { id: true, name: true },
    });

    if (!medication) {
      skipped++;
      continue;
    }

    // Every seeded medication has a route/form. A missing strength is still
    // a valid reference formulation, so keep it as an explicit placeholder
    // instead of dropping the entire MedicationStrength row.
    const strength = formulation.strength?.trim() || 'Unspecified';
    const dosageForm = formulation.dosageForm.trim();
    const route = formulation.route.trim();

    // First repair an existing row with the same medication/strength/form
    // whose route was previously left empty by legacy seed data.
    const incomplete = await prisma.medicationStrength.findFirst({
      where: {
        medicationId: medication.id,
        strength,
        dosageForm,
        OR: [{ route: null }, { route: '' }],
      },
    });

    if (incomplete) {
      await prisma.medicationStrength.update({
        where: { id: incomplete.id },
        data: {
          route,
          active: true,
        },
      });
      repaired++;
      continue;
    }

    const existing = await prisma.medicationStrength.findFirst({
      where: {
        medicationId: medication.id,
        strength,
        dosageForm,
        route,
      },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.medicationStrength.update({
          where: { id: existing.id },
          data: { active: true },
        });
        restored++;
      }
      continue;
    }

    await prisma.medicationStrength.create({
      data: {
        medicationId: medication.id,
        strength,
        dosageForm,
        route,
        active: true,
      },
    });
    created++;
  }

  console.log(
    `Medication formulation backfill complete: ${formulations.length} seed records checked.`,
  );
  console.log(
    `Created: ${created}; repaired: ${repaired}; restored: ${restored}; skipped: ${skipped}`,
  );
}

main()
  .catch((error) => {
    console.error('Medication formulation backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
