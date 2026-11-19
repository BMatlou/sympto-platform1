# Local PostgreSQL connection (Windows)

The API uses Prisma 7 with the PostgreSQL driver adapter. When you run the NestJS API directly from Windows, its database URL must point to the host-published PostgreSQL port.

The repository-root `docker-compose.yml` defines the local development database:

- Host: `127.0.0.1` (or `localhost`)
- Port: `5432`
- Database: `sympto`
- User: `postgres`
- Password: `postgres`

These credentials are for local development only. Do not use them in production.

## 1. Start PostgreSQL

Open PowerShell in the repository root:

```powershell
docker compose up -d postgres
docker compose ps
docker compose logs --tail 60 postgres
```

Wait until the `sympto-postgres` service reports `healthy`. The Compose health check uses `pg_isready` to confirm that PostgreSQL is accepting connections.

## 2. Check the API environment

The API loads `.env` from its working directory (`api`). If `api/.env` does not exist yet, create it from the tracked example:

```powershell
Copy-Item api/.env.example api/.env
```

If `api/.env` already exists, do not overwrite it. Open it and confirm that `DATABASE_URL` points to the local Docker database:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sympto?schema=public"
```

When the API runs directly on Windows, use `localhost` or `127.0.0.1` as the host. The hostname `postgres` is for containers on the same Docker Compose network.

## 3. Verify the port

In PowerShell:

```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

The result should show `TcpTestSucceeded : True`. If it is false, check that Docker Desktop is running, inspect the PostgreSQL logs, and check whether another process is already using port 5432.

## 4. Verify Prisma before starting the API

```powershell
Set-Location api
npx prisma migrate status
```

Review the migration status before applying anything. If Prisma reports a failed migration, stop and resolve that migration deliberately. Do not run `prisma migrate reset`, delete the `postgres_data` volume, or run destructive database commands to fix a connection-refused error.

Then start the API:

```powershell
npm run start:dev
```

## What ECONNREFUSED means

Prisma's `ECONNREFUSED` means the TCP connection to the configured database host and port was rejected. The admin `findUnique()` call is only the first query that exposed the unavailable database; changing that query will not restore the PostgreSQL service.

If you use a hosted database instead of the local Compose service, keep its existing connection URL and verify that the provider allows connections from your machine. Never paste the full URL or its password into an issue or chat.
