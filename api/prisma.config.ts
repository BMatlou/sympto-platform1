import 'dotenv/config';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts && tsx prisma/ensure-patient-medication-permissions.ts && tsx prisma/ensure-medication-formulations.ts',
  },

  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL,
  },
});
