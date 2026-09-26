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

Confirm approved content and policies, account/recovery owners, on-call and
rollback contacts, separate staging/production databases and webhooks, secret
rotation, retention, edge rate limits, monitoring, certificate alerts, backup
failure alerts, and an isolated restoration rehearsal. A technical pass does
not approve business claims or policies.

Reference current provider documentation again before purchase or integration:
Cloudflare, Coolify, Hetzner, staff-email providers, OpenAI, and the selected
payment/Meta providers.
