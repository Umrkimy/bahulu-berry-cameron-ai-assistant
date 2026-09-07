# Local demo data guide

This project includes an opt-in fictional dataset for local development,
testing, and interface review. It adds missing sample records only; it does not
delete, overwrite, import, or modify client records.

## Seed a local environment

```powershell
cd backend
uv run python -m app.demo_seed --fictional-demo
```

The command creates fictional Owner and Staff accounts, a product, inventory,
promotion, order, payment, refund request, approved support content, support
ticket, note, and simulator event. It uses the `.invalid` email domain and test
credentials only.

For a fresh local SQLite environment, remove only a database you created for
testing, run `uv run alembic upgrade head`, then run the seed command. Never
delete a database that may contain client records.

For Docker PostgreSQL:

```powershell
docker compose up --build
docker compose exec api python -m app.demo_seed --fictional-demo
```

To reset a disposable Docker environment, first confirm it contains no client
data. Then run `docker compose down -v`, start Compose again, and seed it. The
volume deletion is irreversible.

## Security checks

- Never add credentials, webhook tokens, customer data, payment identifiers,
  or real contact details to sample records or screenshots.
- Keep `.env` files local and use the provided environment-variable examples.
- Review screenshots and support records before sharing them outside the team.
- Use fictional data for any training, test, or interface-review environment.
