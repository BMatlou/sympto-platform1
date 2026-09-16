import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MEDICATION_REFERENCE, seedMedicationReference } from './medication-reference';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';

type RxNavResponse = { idGroup?: { rxnormId?: string[] } };

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function queryNames(name: string, genericName: string) {
  const names = [genericName, name];
  if (normalize(name).includes('paracetamol') || normalize(genericName).includes('paracetamol')) {
    names.unshift('acetaminophen');
  }
  if (normalize(name).includes('carbimazole') || normalize(genericName).includes('carbimazole')) {
    names.unshift('methimazole');
  }
  return [...new Set(names.filter(Boolean))];
}

async function resolveRxNormCode(name: string, genericName: string) {
  for (const candidate of queryNames(name, genericName)) {
    try {
      const response = await fetch(
        `${RXNAV}/rxcui.json?name=${encodeURIComponent(candidate)}&search=1`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) continue;
      const result = await response.json() as RxNavResponse;
      const code = result.idGroup?.rxnormId?.[0];
      if (code) return code;
    } catch {
      // Name-based DailyMed lookup remains available to the clinical enricher.
    }
  }
  return null;
}

async function main() {
  await seedMedicationReference(prisma);

  // The catalogue is the authoritative identity layer. Resolve missing RxNorm
  // identifiers after the catalogue rows exist so both updates and new rows
  // receive the same identifier contract.
  let rxNormResolved = 0;
  let rxNormMissing = 0;

  for (const medication of MEDICATION_REFERENCE) {
    const existing = await prisma.medication.findFirst({
      where: { name: { equals: medication.name, mode: 'insensitive' } },
      select: { id: true, rxNormCode: true },
    });

    if (!existing) continue;
    if (existing.rxNormCode) {
      rxNormResolved++;
      continue;
    }

    const rxNormCode = await resolveRxNormCode(medication.name, medication.genericName);
    if (rxNormCode) {
      await prisma.medication.update({
        where: { id: existing.id },
        data: { rxNormCode },
      });
      rxNormResolved++;
    } else {
      rxNormMissing++;
      console.warn(`RXNORM NOT RESOLVED: ${medication.name}`);
    }
  }

  const medicationCount = await prisma.medication.count({
    where: { active: true, searchable: true },
  });

  const formulationCount = await prisma.medicationStrength.count({
    where: { active: true },
  });

  const sentinelNames = ['Paracetamol', 'Metformin', 'Amlodipine', 'Aspirin'];
  const sentinels = await prisma.medication.findMany({
    where: {
      active: true,
      OR: sentinelNames.map(name => ({ name: { equals: name, mode: 'insensitive' as const } })),
    },
    select: { name: true, rxNormCode: true },
  });

  const missingSentinels = sentinelNames.filter(
    name => !sentinels.some(m => normalize(m.name) === normalize(name)),
  );
  if (missingSentinels.length) {
    throw new Error(`Medication reference validation failed. Missing sentinel medications: ${missingSentinels.join(', ')}`);
  }

  const missingSentinelRxNorm = sentinels
    .filter(m => sentinelNames.some(name => normalize(name) === normalize(m.name)) && !m.rxNormCode)
    .map(m => m.name);

  if (missingSentinelRxNorm.length) {
    throw new Error(`Medication reference validation failed. Missing RxNorm identifiers for sentinel medications: ${missingSentinelRxNorm.join(', ')}`);
  }

  console.log(`Medication reference data established: ${MEDICATION_REFERENCE.length} curated medications.`);
  console.log(`Active searchable medications: ${medicationCount}`);
  console.log(`Active medication formulations: ${formulationCount}`);
  console.log(`RxNorm identifiers resolved/preserved: ${rxNormResolved}`);
  console.log(`RxNorm identifiers unresolved: ${rxNormMissing}`);
  console.log(`Medication reference validation: PASS (${sentinelNames.join(', ')})`);
}

main()
  .catch((error) => {
    console.error('Medication reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
