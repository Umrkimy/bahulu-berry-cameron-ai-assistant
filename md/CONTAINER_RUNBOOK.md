# Container Runbook

## Local start

1. Copy the root `.env.example` file to `.env`.
2. Replace all placeholder values with local test secrets.
3. Run `docker compose up --build` from the repository root.
4. Check `http://localhost:8000/health` and `http://localhost:8000/ready`.

The API container runs `alembic upgrade head` before Uvicorn. Do not use the Compose database volume as a production backup strategy.

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

For a managed production PostgreSQL database, use the provider's encrypted backup facility. Test restoring a backup into a separate non-production database before relying on it.

For a local Compose database, use `pg_dump` through the `db` container and restore only into a disposable local database. Never share a database dump that contains real customer data.

## Deployment boundary

- Vercel builds and serves the static frontend; it does not need this Docker image.
- A container host or VPS runs the FastAPI image.
- Production uses client-owned PostgreSQL and environment-provided secrets.
- Run Alembic in a one-off release job before starting new API containers.
