require('dotenv/config');

const { execSync } = require('child_process');

const testDatabaseUrl = new URL(process.env.DATABASE_URL);
testDatabaseUrl.pathname = '/sympto_test';
testDatabaseUrl.search = '';

execSync('npx jest --config ./test/jest-e2e.json --runInBand', {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    TEST_DATABASE_URL: testDatabaseUrl.toString(),
  },
});
