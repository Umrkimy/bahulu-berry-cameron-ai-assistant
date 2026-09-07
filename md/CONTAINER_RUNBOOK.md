# Container Runbook

## Local start

1. Copy the root `.env.example` file to `.env`.
2. Replace all placeholder values with local test secrets.
3. Run `docker compose up --build` from the repository root.
4. Check `http://localhost:8000/health` and `http://localhost:8000/ready`.

The API container runs `alembic upgrade head` before Uvicorn. Do not use the Compose database volume as a production backup strategy.

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
