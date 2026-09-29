# Deployment and budget reference

Planning only. This does not authorise purchases, public access, production
data, checkout, payments, tracking, or live WhatsApp.

## Intended first-production shape

```text
Users -> Cloudflare DNS/TLS/CDN/Access -> Hetzner Singapore CPX22
                                      -> Coolify
                                         - storefront
                                         - protected dashboard
                                         - FastAPI
                                         - PostgreSQL 16 + pgvector
                                      -> encrypted off-site backups
```

Start with one Coolify-managed VPS only after staging proves the migrations,
security, monitoring, backup, and restore path. Keep PostgreSQL private. Split
services or add Redis only when measured load, job processing, shared rate
limits, or reliability needs justify it. Never cache payment state, customer
records, confirmations, or complete AI replies by default.

## Planning budget (reviewed 13 September 2026)

| Item | Planning amount |
| --- | ---: |
| Hetzner Singapore CPX22, before tax/IPv4 | about RM136/month |
| Malaysian cPanel staff email, annual equivalent | about RM9/month |
| Cloudflare Free, self-hosted Coolify, R2 free allowance | RM0 initially |
| Operations Copilot + WhatsApp RAG hard caps | maximum about RM110/month |
| Total if both AI caps are fully used | about RM255/month |

Recheck all prices, taxes, renewal terms, capacity, and provider availability
before purchase. Domain renewal, payment/Meta fees, staging time, IPv4,
transactional email, and storage above free allowances are excluded.

## Ownership and release sequence

- The client owns production domain, Cloudflare, host, database, OpenAI,
  backups, payment, Meta, billing, and recovery accounts.
- Keep GoDaddy as registrar initially and move DNS management to Cloudflare only
  when deployment is approved. Proposed hostnames remain unapproved.
- Rehearse on temporary fictional-data staging with separate secrets and test
  provider accounts. Apply migrations as a one-off release job, then require
  `/health` and `/ready` before routing traffic.
- Provision production fresh in client-owned accounts only after staging and
  the quality gate pass. Remove staging deliberately after stable release.
- Use exact HTTPS origins/hosts, secure cookies, a unique strong application
  secret, private networking, encrypted daily backups, monitored restore tests,
  uptime/error alerts, and a named rollback owner.
- Configure client-owned transactional email and verified DNS records before
  enabling delivery. Local/staging remains console-only unless explicitly
  testing an approved sender.

## Before production

A technical pass does not approve business claims or policies. Statuses as of
29 September 2026 (verified / not applicable / awaiting client). The runbook
is in [operations.md](operations.md#production-runbook).

| Item | Status | Notes |
| --- | --- | --- |
| Structured, redacted API logs with request IDs | Verified | JSON on stdout; emails, phones, tokens, cookies and message text masked; tests in `backend/tests/test_logging.py` |
| `/ready` gates on the current migration | Verified | Reports the Alembic revision; 503 when migrations are pending |
| Encrypted database + photo backups with 7 daily / 4 weekly retention | Verified | `backup` compose profile, rehearsed on fictional data |
| Isolated restore rehearsal | Verified | `restore-test.sh` checks revision, row counts and photo count, then drops the throwaway DB |
| Secret rotation procedure | Verified | Table in the runbook |
| Optional error alerts (Sentry) | Awaiting client | Code ready and scrubbed; needs a client-owned account and `SENTRY_DSN` |
| Off-site backup storage and schedule | Awaiting client | Client-owned bucket plus daily cron/Coolify task; backup-age alert |
| Backup private key custody | Awaiting client | Client owner keeps the age private key offline |
| Uptime and certificate alerts | Awaiting client | `/health` and `/ready` checks; Cloudflare certificate alerts |
| Account and recovery owners, on-call and rollback contacts | Awaiting client | Name a rollback owner before launch |
| Separate staging and production databases, webhooks and secrets | Awaiting client | Needs client-owned production accounts |
| Edge rate limits (Cloudflare) | Awaiting client | App limits exist; edge rules need the client's Cloudflare |
| Approved content, policies and checkout terms | Awaiting client | See `docs/quality-gate.md` |
| Live payments | Awaiting client | Provider undecided; `PAYMENTS_LIVE_APPROVED` stays false |
| Multi-instance shared rate limiter | Not applicable | Single VPS at launch |

Reference current provider documentation again before purchase or integration:
Cloudflare, Coolify, Hetzner, staff-email providers, OpenAI, and the selected
payment/Meta providers.
