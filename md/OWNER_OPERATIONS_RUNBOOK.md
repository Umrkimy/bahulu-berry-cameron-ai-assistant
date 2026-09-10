# Owner Operations Runbook

This runbook is for the Owner operating the local Bahulu Berry Cameron system
and its private Cloudflare client demo. It is not a production deployment
guide. Keep passwords, `.env` files, backup archives, tunnel tokens, and real
customer data private.

Read [the product quality and launch gate](PRODUCT_QUALITY_GATE.md) before
sharing a demo or changing customer-facing content.

## 1. Normal local operation

### Start

1. Open Docker Desktop and wait until it reports that it is running.
2. Open PowerShell in the project folder.
3. Start the local stack:

   ```powershell
   docker compose up -d --build
   ```

4. Wait for the API to be healthy, then open:

   - Dashboard: `http://localhost:5173`
   - Storefront: `http://localhost:3000`
   - API health: `http://localhost:8000/health`
   - API readiness: `http://localhost:8000/ready`

`/health` confirms the API is running. `/ready` also confirms the database and
the current migration are ready. If either check fails, do not make operational
changes; use the incident playbook below first.

### Finish safely

1. Finish or hand over work in progress before stopping the stack.
2. Stop normal local services without deleting their data:

   ```powershell
   docker compose down
   ```

Do not use commands that remove Docker volumes unless recovery is explicitly
planned. Docker volumes hold the local database.

## 2. Private client demo

The demo is available only while this computer, Docker Desktop, the demo stack,
and the Cloudflare connector are running. It remains protected by Cloudflare
Access; give clients the demo URL and Access invitation, never a tunnel token.

### Start and verify

1. Confirm the ignored `.env.demo` file is already configured locally. Never
   paste, email, screenshot, or commit its contents.
2. Start the isolated demo profile:

   ```powershell
   docker compose --env-file .env.demo -f compose.yaml -f compose.staging.yaml --profile tunnel up -d --build
   ```

3. Verify services without showing environment values:

   ```powershell
   docker compose --env-file .env.demo -f compose.yaml -f compose.staging.yaml --profile tunnel ps
   ```

4. In an incognito/private browser, open the approved demo URL. Cloudflare
   Access should require the invited client to authenticate before the
   dashboard is visible.
5. Use only fictional demo records. The demo does not authorise public
   checkout, live payments, live WhatsApp, customer data collection, analytics,
   or new public claims.

### Stop

When client review is finished, disconnect the demo and leave no public route
running from this computer:

```powershell
docker compose --env-file .env.demo -f compose.yaml -f compose.staging.yaml --profile tunnel down
```

The normal local stack can then be started separately with `docker compose up
-d --build` when needed.

## 3. Everyday Owner tasks

### Team access and recovery

- Owners use **Team & Roles** to add team members, update their details, and
  deactivate access when a person leaves. Deactivation preserves records and
  blocks sign-in; the last active Owner cannot be deactivated.
- Use **Settings → Email & account security** to send a reset link only to an
  active team member. The link is single-use and expires after 30 minutes.
- Staff use the existing **Forgot password** flow for their own account. Do
  not share accounts or passwords.
- Review **Updates** for assigned notification history and live operational
  alerts. Live alerts disappear once the underlying issue is resolved.

### Daily operations

- Start with **Today** and **Updates**, then prioritise paid orders, packing,
  deliveries, stock issues, refunds, and support work.
- In **Fulfilment**, open one paid order, complete every packing checklist line,
  then explicitly confirm dispatch. Courier and tracking details remain
  optional operational fields.
- In **Inventory**, use **Receive stock** for one supplier delivery with its
  required delivery-note/invoice reference. Check the review before confirming.
- Product CSV import is Owner-only and create-only. Download the template,
  preview every row, and confirm only when every row is valid. Existing product
  names are never overwritten; imported products remain storefront drafts.

## 4. Backup and restore rehearsal

Backups are manual at this local stage. A backup can contain personal and
business data: store it privately, do not upload it to GitHub, attach it to a
support request, or share it through the client demo.

### Create a backup

With the normal local database running, execute:

```powershell
.\scripts\Backup-LocalPostgres.ps1
```

The script creates a compressed `.dump` archive under the ignored `backups`
folder by default. Confirm it reports a non-empty archive. Move or copy it only
to an approved private location if required.

### Test a restore without changing the working database

Use the archive path printed by the backup script:

```powershell
.\scripts\Test-LocalPostgresRestore.ps1 -BackupPath .\backups\your-backup.dump
```

The script restores into a uniquely named disposable database, applies the
current migrations there, runs readiness verification, then removes the
temporary database. A passing message confirms the active Compose database was
not changed. Do not use `-KeepRestoredDatabase` unless investigating a specific
recovery issue.

Run this rehearsal after a meaningful database/migration change and before a
future production release. It is not a substitute for managed, encrypted,
off-site production backups and a documented restore owner.

## 5. Incident playbook

| Situation | Safe response |
| --- | --- |
| Docker Desktop or local app is unavailable | Confirm Docker Desktop is running, run `docker compose ps`, then start/rebuild the normal stack. Check `/health` and `/ready` before using the dashboard. |
| Private demo is inaccessible | Confirm the PC is awake, Docker Desktop is running, and the demo profile is up. Check Cloudflare Access invitations and connector status in Cloudflare; never expose the tunnel token to troubleshoot. |
| Cloudflare Access session expired | Sign in again through Cloudflare Access. This is separate from the dashboard password and is expected after session expiry. |
| Dashboard password is forgotten | Use the self-service reset link, or an Owner sends a reset link from Settings to the active account holder. Do not disclose whether any other account exists. |
| A secret may have been exposed | Stop sharing the affected material, revoke/rotate it at its provider immediately, update the ignored local environment value, inspect Git history and logs, and record what happened. Do not commit a replacement secret. |
| A data mistake is suspected | Stop further edits, identify the affected records and activity history, and make a private backup. Do not overwrite or delete records to hide the issue. Restore only into an isolated database for investigation; agree a recovery action before touching the working database. |

## 6. Never do these things

- Never commit `.env` files, backups, screenshots containing secrets, client
  credentials, tunnel tokens, or real customer records.
- Never use fictional demo data as a source for real customer, product, order,
  payment, or delivery records.
- Never publish fake reviews, unlicensed imagery, placeholder policies,
  unsupported business claims, tracking, non-essential cookies, checkout, or
  live WhatsApp support without the client approvals required by the quality
  gate.
- Never delete Docker volumes, modify a database directly, or run a destructive
  recovery command without a verified backup and an agreed recovery plan.
