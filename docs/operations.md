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

## Reseller stock workflow

Bahulu Berry Cameron is modelled as a reseller of ready-to-sell bahulu, not as
a manufacturer. The working unit is the supplier-packaged packet or box that
is also sold to the customer. There is no ingredient inventory, recipe, yield,
production batch, packaging conversion, repacking, or production schedule.

The private-acceptance workflow is:

1. A supplier delivers ready-packaged products.
2. An Owner or Staff member opens Inventory, selects **Receive stock**, and
   records the active supplier, delivery-note or invoice reference, products,
   and received sellable-unit quantities.
3. The confirmed receipt atomically increases finished-product stock and adds
   immutable movements naming the recorder, supplier, reference, time, and
   before/after quantities.
4. Order creation deducts stock through the backend-authoritative order flow.
   The movement history identifies this as an automatic order movement.
5. An eligible cancellation restores the same quantity and links the movement
   to the order.
6. An Owner or Staff member records damaged, missing, expired, or stock-count
   differences as a manual adjustment. A reduction requires a written reason
   and explicit confirmation.
7. Fulfilment picks the existing retail packs for pickup or dispatch. It does
   not open, manufacture, convert, or repackage the product.

Only Owners manage supplier records and opening balances. Owner and Staff may
record supplier receipts and daily corrections. Storefront availability and
all order quantities remain controlled by current backend inventory.

### Fictional acceptance walkthrough

- As Owner, create or activate a fictional supplier and set a fictional
  product's opening balance.
- As Staff, receive several sellable packs using a fictional reference such as
  `DN-DEMO-001`; confirm that the new total and recorder appear in Inventory.
- Create a fictional order and confirm one automatic order deduction with its
  order source, then cancel it and confirm the matching restoration.
- Record one fictional damaged-unit reduction, confirm the warning, and verify
  the required reason, recorder, timestamp, and before/after quantities.
- Open Fulfilment and confirm that the task is picking existing packs only.
- Never use real supplier contacts, invoices, customer details, or live orders
  in this walkthrough.

### Awaiting client confirmation

Expiry support remains unimplemented until the client confirms how suppliers
provide best-before information. If approved later, record an optional date on
each received product line and show advisory expiring/expired warnings only;
do not silently reduce stock or public availability.

The client must also confirm:

- the sellable unit name for every product;
- whether best-before dates apply per product line, carton, or delivery, and
  how far in advance a warning should appear;
- the approved adjustment-reason list;
- the physical stock-count frequency;
- low-stock thresholds and who decides when to reorder.

Until those decisions are recorded, continue using free-text reasons and the
existing low-stock thresholds. Do not add recipe costing, ingredient stock,
lot allocation, production planning, packaging consumption, or automatic
expiry deductions.

## Backup and restore rehearsal

Encrypted backups (staging and production) cover the database **and** product
photos in one file. They run from the `backup` compose profile:

```bash
docker compose --profile backup run --rm backup
```

- Each run writes `bahulu-YYYYmmdd-HHMMSS-daily.tar.age` (or `-weekly` on
  Sundays, KL time) to `BACKUP_DIR`, encrypted to the `AGE_RECIPIENT` public
  key. The newest 7 daily and 4 weekly are kept; older ones are deleted.
- The file holds `db.dump`, `media.tar` and a `manifest.txt` with the Alembic
  revision, every table's row count and the photo count, all taken from one
  database snapshot.
- Set `BACKUP_KIND=weekly` to force a long-lived copy, for example before a
  migration or data cleanup.
- On Linux, `BACKUP_DIR` must be writable by uid 999 (the container's
  `postgres` user).

Restore rehearsal (monthly, and after any change to backups): mount the
**private** key read-only for this one command only.

```bash
docker compose --profile backup run --rm \
  -v /secure/path/age-key.txt:/run/secrets/age-identity:ro \
  --entrypoint restore-test.sh backup /backups/bahulu-YYYYmmdd-HHMMSS-daily.tar.age
```

It restores into a throwaway database, checks the revision, every row count
and the photo count against the manifest, and always drops the throwaway
database. The working database is not touched.

Key custody: create the key pair once with `age-keygen` on a trusted machine.
Only the public key (`age1...`) goes on the server. The client owner keeps the
private key offline (password manager plus a printed copy in a safe place).
Without it, backups cannot be restored.

For quick local Windows rehearsals of the database only (unencrypted, kept in
the ignored `backups/` directory):

```powershell
.\scripts\Backup-LocalPostgres.ps1
.\scripts\Test-LocalPostgresRestore.ps1 -BackupPath .\backups\your-backup.dump
```

## Production runbook

The client owns the host (Coolify), off-site storage and alert accounts. This
section documents what to set up there; none of it is created from this repo.

### Deploy

1. Take a backup with `BACKUP_KIND=weekly` if the release includes a migration.
2. Build the new images and tag them with the Git commit.
3. Run migrations once as a job: `docker compose run --rm migrate`.
4. Start the new `api`, `frontend` and `storefront`.
5. Gate traffic on `/health` (process up) and `/ready`. `/ready` returns
   `{"status":"ready","revision":"<id>"}` only when the database answers and
   is on this build's migration. `migrations_pending` means step 3 did not
   finish; `unavailable` means the database is unreachable.
6. Smoke-check the dashboard sign-in and the storefront home page.

### Roll back

- **Code problem, data fine:** redeploy the previous image tag. If the new
  release ran a migration, check it has a working downgrade before running
  `alembic downgrade <previous revision>`; otherwise keep the new schema and
  fix forward.
- **Data damaged:** stop edits (take the dashboard offline if needed), take a
  fresh backup of the current state as evidence, run `restore-test.sh` on the
  chosen backup, then restore into a new database and point the API at it.
  Record what data between the backup and the incident is lost (orders,
  stock movements) and re-enter it from WhatsApp and payment records.
- Product photos are restored from `media.tar` into the `product_media`
  volume together with the matching database backup.

### Off-site copy and schedule (client-owned)

- Schedule the backup daily at 02:00 KL time with host cron or a Coolify
  scheduled task.
- Copy each new `.tar.age` to client-owned storage in another location (for
  example an S3-compatible bucket with object lock or versioning). The files
  are already encrypted.
- Alert if the newest backup is older than 26 hours.

### Alerts (client-owned)

- Uptime checks on `/health` and `/ready` every minute, alerting the rollback
  owner after 3 failures.
- Backup-age alert (above).
- Optional Sentry: set `SENTRY_DSN` to receive crash reports. Events carry no
  cookies, headers, request bodies, query strings, user details or local
  variables, and remaining text is redacted.
- Certificate expiry alerts from Cloudflare.

### Logs

The API writes one JSON object per line to stdout with `ts` (KL time),
`level`, `logger`, `event` and `request_id`. Emails, phone numbers, tokens,
cookies, `Authorization` values and message text are replaced with
`[redacted]` before writing. Every response carries `X-Request-ID`; ask for it
when a customer or staff member reports an error and search the logs for it.
Set `LOG_FORMAT=text` for easier local reading.

### Rotate secrets

Rotate immediately on suspected exposure, and when staff with access leave.

| Secret | How | Effect |
| --- | --- | --- |
| `SECRET_KEY` | New random value of 32+ characters, restart `api` | Signs everyone out |
| `POSTGRES_PASSWORD` | `ALTER ROLE` in the database, update env, restart `api` and `backup` | Brief API restart |
| Stripe / payment keys | Roll in the provider dashboard, update env | Old key stops working |
| Payment webhook secret | Roll the endpoint secret in the provider, update env | Unsigned events rejected until updated |
| Meta app secret and verify token | Regenerate in Meta, update env | Webhook re-verification |
| `OPENAI_API_KEY`, `RESEND_API_KEY`, Google keys | Revoke and create in each provider | None beyond restart |
| age backup key | New key pair; new `AGE_RECIPIENT`; keep the old private key until its backups age out | Old backups still need the old key |
| Cloudflare tunnel token | Rotate in Cloudflare | Tunnel reconnects |

Never paste secret values into chats, tickets, logs or commits.

## Incident response

- If health/readiness fails, stop operational edits, inspect `docker compose
  ps` and service logs, and restore service before continuing. Use the
  `X-Request-ID` of a failing request to find its log lines.
- Record each incident privately: time found, impact, request IDs, actions
  taken, data affected, and follow-ups. If customer personal data may have
  been exposed, tell Umar and the client owner the same day so they can decide
  on PDPA notification.
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
