# Container Runbook

## Local start

1. Copy the root `.env.example` file to `.env`.
2. Replace all placeholder values with local test secrets.
3. Run `docker compose up --build` from the repository root. The `migrate`
   service applies Alembic before the API can start.
4. Check `http://localhost:8000/health` and `http://localhost:8000/ready`.

Do not use the Compose database volume as a production backup strategy.

## Browser tests

The Playwright specs use mocked API responses, so they can run without an
OpenAI key or seeded database:

```powershell
docker compose --profile e2e run --rm e2e
```

This starts the frontend development server from the Playwright test runner
and executes the desktop and mobile browser projects. The normal `docker
compose up` path does not start this service.

The API container uses `Asia/Kuala_Lumpur` as its process timezone. Task
deadlines still remain backend-authoritative and should include an explicit
Malaysia offset when submitted by the AI.

## AI budget check

The supplied Compose defaults use `gpt-4o-mini` with a US$8 monthly dashboard-AI cap and an approximate RM display. Check **AI Usage & Budget** as an Owner after making test requests. Keep the cap and API key in environment values; never commit them.

## Backup and restore

Run a safe local backup rehearsal only against fictional/test data:

```powershell
.\scripts\Backup-LocalPostgres.ps1
.\scripts\Test-LocalPostgresRestore.ps1 -BackupPath .\backups\bahulu-local-YYYYMMDD-HHMMSS.dump
```

The backup uses `pg_dump` in the existing `db` container. The restore command
creates a randomly named disposable database, restores into it, applies the
current migrations, verifies application database connectivity, then deletes
that disposable database. It never overwrites the active Compose database.
Use `-KeepRestoredDatabase` only when investigating a failed rehearsal, then
drop the disposable database manually afterwards.

Archives are written to the ignored `backups/` folder. They can contain customer
data, so never commit, share, email, or use them as a production backup. For a
managed production database, use the provider's encrypted backup facility and
test restoration into a separate non-production database before relying on it.

## Local staging rehearsal

1. Copy `.env.staging.example` to the ignored `.env.staging` and replace every
   placeholder with **test-only** values.
2. Run the migration release step explicitly:

   ```powershell
   docker compose -p bahulu-staging --env-file .env.staging -f compose.yaml -f compose.staging.yaml run --rm migrate
   ```

3. Start the isolated staging-style stack:

   ```powershell
   docker compose -p bahulu-staging --env-file .env.staging -f compose.yaml -f compose.staging.yaml up --build
   ```

4. Check `http://localhost:18000/health`, `http://localhost:18000/ready`, and
   `http://localhost:15173`.

The staging override uses a separate named PostgreSQL volume, requires strict
origins/hosts, disables debug mode, and keeps Meta intake disabled. It is a
local HTTP rehearsal, so secure cookies are verified only after a future HTTPS
host is selected; production remains the only environment that sets secure
cross-site cookies. The separate `bahulu-staging` project name is required so
the rehearsal can never attach to the normal local stack or its database. Keep
the staging API and frontend ports at `18000` and `15173` so they cannot collide
with the normal local stack on `8000` and `5173`.

## Deployment boundary

- Vercel builds and serves the static frontend; it does not need this Docker image.
- A container host or VPS runs the FastAPI image.
- Production uses client-owned PostgreSQL and environment-provided secrets.
- Run the `migrate` service as a one-off release job before starting new API containers.
