import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  const patientRole = await prisma.role.findUnique({
    where: { name: 'PATIENT' },
  });

  if (!patientRole) {
    throw new Error('PATIENT role was not found. Run the main Prisma seed first.');
  }

  const permission = await prisma.permission.upsert({
    where: { name: 'patient-medications.adherence' },
    update: {},
    create: {
      name: 'patient-medications.adherence',
      description: 'Allows a patient to record Taken or Skipped medication doses.',
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: patientRole.id,
        permissionId: permission.id,
      },
    },
    update: {},
    create: {
      roleId: patientRole.id,
      permissionId: permission.id,
    },
  });

  console.log('Patient medication adherence permission ensured.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
