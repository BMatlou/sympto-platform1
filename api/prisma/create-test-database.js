require('dotenv/config');

const { execSync } = require('child_process');
const { Client } = require('pg');

const databaseName = 'sympto_test';

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/postgres';
  url.search = '';
  const testDatabaseUrl = new URL(url);
  testDatabaseUrl.pathname = `/${databaseName}`;

  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  const exists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName],
  );

  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${databaseName}`);
    console.log(`Created ${databaseName}.`);
  } else {
    console.log(`${databaseName} already exists.`);
  }

  await client.end();

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl.toString() },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
