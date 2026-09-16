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
    throw new Error('PATIENT role was not found. Run the main seed first.');
  }

  const permissions = [
    'patient-medications.read',
    'patient-medications.create',
    'patient-medications.update',
    'patient-medications.delete',
  ];

  for (const name of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
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
  }

  console.log('Patient medication permissions ensured.');
}

main()
  .catch((error) => {
    console.error('Failed to ensure patient medication permissions:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
