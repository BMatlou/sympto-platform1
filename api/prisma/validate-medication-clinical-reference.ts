import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const medications = await prisma.medication.count({ where: { active: true, searchable: true } });
  const relationships = await prisma.medicationClinicalReference.count({ where: { active: true } });

  if (medications === 0) throw new Error('Clinical reference validation failed: medication master is empty.');
  if (relationships === 0) throw new Error('Clinical reference validation failed: no active MedicationClinicalReference rows exist.');

  const sentinels = ['Paracetamol', 'Metformin', 'Amlodipine', 'Aspirin'];
  const failures: string[] = [];

  for (const name of sentinels) {
    const medication = await prisma.medication.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, active: true },
      select: { id: true, name: true },
    });

    if (!medication) {
      failures.push(`${name}: medication row missing`);
      continue;
    }

    const referenceCount = await prisma.medicationClinicalReference.count({
      where: { medicationId: medication.id, active: true },
    });

    if (referenceCount === 0) failures.push(`${name}: zero clinical reference rows`);
  }

  const orphaned = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "MedicationClinicalReference" mcr
    LEFT JOIN "Medication" m ON m.id = mcr."medicationId"
    LEFT JOIN "Symptom" s ON s.id = mcr."symptomId"
    WHERE m.id IS NULL OR s.id IS NULL
  `;

  if (Number(orphaned[0]?.count ?? 0) > 0) {
    failures.push(`orphaned clinical references: ${orphaned[0].count.toString()}`);
  }

  if (failures.length) {
    throw new Error(`Clinical reference validation failed:\n- ${failures.join('\n- ')}`);
  }

  console.log(`Clinical reference validation: PASS (${medications} medications, ${relationships} active relationships).`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
