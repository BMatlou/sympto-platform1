import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MEDICATION_REFERENCE, seedMedicationReference } from './medication-reference';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  await seedMedicationReference(prisma);

  const medicationCount = await prisma.medication.count({
    where: { active: true, searchable: true },
  });

  const formulationCount = await prisma.medicationStrength.count({
    where: { active: true },
  });

  console.log(
    `Medication reference data established: ${MEDICATION_REFERENCE.length} curated medications.`,
  );
  console.log(`Active searchable medications: ${medicationCount}`);
  console.log(`Active medication formulations: ${formulationCount}`);
}

main()
  .catch((error) => {
    console.error('Medication reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
