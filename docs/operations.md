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
