# Owner operations

This runbook covers the local system and private fictional-data demo. It does
not authorise production deployment or public access.

## Start and stop

1. Start Docker Desktop.
2. Run `docker compose up -d --build` from the repository root.
3. Verify the dashboard at `http://localhost:5173`, storefront at
   `http://localhost:3000`, and API `/health` and `/ready` at port 8000.
4. Stop normally with `docker compose down`. Never add `-v` to an ordinary
   stop because volumes hold local data.

For an approved private demo, use the ignored `.env.demo` file and the staging
profile documented in `compose.staging.yaml`. Confirm Cloudflare Access blocks
uninvited visitors, use fictional records only, and stop the tunnel profile
after review. Never disclose the tunnel token.

## Daily operation

- Owners manage team access and reset links. Deactivate departed users rather
  than deleting audit history; the last active Owner cannot be deactivated.
- Start with Today and Updates. Use Fulfilment for packing/dispatch, Inventory
  for referenced stock receipts, Products for create-only CSV imports, and
  Activity for change history.
- Product imports require a fully valid preview and never overwrite existing
  product names. Imported products begin as storefront drafts.
- Stripe remains test-only. WhatsApp remains a staff-reviewed simulator.
- Do not turn fictional demo content into real product, order, customer,
  payment, or delivery data.

## Backup and restore rehearsal

With the local database running:

```powershell
.\scripts\Backup-LocalPostgres.ps1
.\scripts\Test-LocalPostgresRestore.ps1 -BackupPath .\backups\your-backup.dump
```

Backups remain private under the ignored `backups/` directory. The restore
script uses a disposable database and must not change the working database.
Back up database and product media together before migrations or data cleanup.

## Incident response

- If health/readiness fails, stop operational edits, inspect `docker compose
  ps` and service logs, and restore service before continuing.
- If a secret may be exposed, revoke/rotate it first, replace only the ignored
  local value, inspect history/logs privately, and never commit the replacement.
- If data may be wrong, stop edits, preserve activity history, take a private
  backup, and investigate through an isolated restore. Do not delete evidence.
- Never delete volumes, directly edit production-like data, or run destructive
  recovery without a verified backup and agreed plan.

## Local operational test

Use test data only. Check Owner and Staff access, product/inventory/promotions,
authoritative order quotes and single stock deductions, delivery audit events,
cancellation stock restoration, signed Stripe test webhooks, idempotent refunds,
CSRF rejection, login rate limits, and safe activity entries. Never use live
provider keys while running this checklist.
