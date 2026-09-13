# Infrastructure Deployment and Budget Reference

**Status:** Planning reference only. It is not approval to buy services,
publish business details, or enable public checkout, live WhatsApp messaging,
or customer data collection.

**Last reviewed:** 13 September 2026

Recheck prices, taxes, availability, provider terms, account ownership, and
`md/PRODUCT_QUALITY_GATE.md` before any purchase or production deployment.

## Agreed first-production shape

```text
Customers and staff
  -> Cloudflare (DNS, TLS, CDN, edge protection, Access for dashboard)
  -> Hetzner Singapore CPX22 VPS (2 vCPU, 4 GB RAM selected starting point)
       -> Coolify, self-hosted
            -> storefront frontend
            -> protected dashboard frontend
            -> FastAPI API
            -> PostgreSQL 16 + pgvector
            -> future Redis and background-worker containers
  -> external encrypted backup storage
```

- Run the storefront, admin frontend, API, and PostgreSQL/pgvector on the same
  Coolify-managed Hetzner CPX22 VPS initially. Production Docker images include
  only runtime needs, not source files, dev dependencies, or build tools.
- Cloudflare serves static storefront assets quickly at the edge. It protects
  the dashboard and API; PostgreSQL is never public.
- Keep persistent database volumes and encrypted daily backups outside the VPS.
  Verify a restore before production.
- Split the database or API into managed/separate infrastructure only when
  measured CPU, memory, connection, latency, or storage metrics justify it.

## Selected initial monthly budget

The selected cost-conscious launch plan is the all-in-one Hetzner option. It
is intended for the first production release, not a guarantee that it supports
one million users or a substitute for monitoring.

| Item | Planning amount |
| --- | ---: |
| Hetzner Singapore CPX22 (2 vCPU, 4 GB RAM) | about RM136/month before tax and IPv4 charges |
| Malaysian cPanel staff email (20 mailboxes, annual billing) | about RM9/month equivalent; verify checkout and renewal price |
| Cloudflare Free, self-hosted Coolify, and R2 under its free allowance | RM0 initially |
| Operations Copilot + WhatsApp RAG hard caps | maximum about RM110/month combined (US$25) |
| **Planning total with full AI caps used** | **about RM255/month** |

The AI figure is a maximum safety allowance, not a fixed monthly bill. Domain
renewal at GoDaddy, taxes, provider IPv4 charges, staging VPS time, payment
fees, Meta charges, and usage above free backup storage are excluded. If the
VPS shows database or memory pressure, first upgrade to CPX32; move PostgreSQL
to a managed provider only when its reliability benefit justifies the cost.

## Domain, DNS, and staff email

- The domain is already registered at GoDaddy. Keep it there initially; do not
  buy a duplicate domain.
- Move DNS management to Cloudflare when deploying, while leaving GoDaddy as
  the registrar.
- Intended private/production hostnames, subject to client approval before any
  public use:

```text
bahuluberry.com        storefront
www.bahuluberry.com    storefront redirect
admin.bahuluberry.com  Cloudflare Access-protected dashboard
api.bahuluberry.com    API and approved future webhooks
demo.bahuluberry.com   private fictional-data demo
```

- Budget staff email option: Malaysian cPanel shared hosting, used for human
  email only, not application hosting. Select a plan that explicitly supports
  at least 20 separate mailboxes and suitable mailbox quotas.
- Individual staff addresses may be `umar@bahuluberry.com`,
  `admin@bahuluberry.com`, and similar. Give every worker a separate password;
  do not share a mailbox account.
- Configure MX, SPF, DKIM, and DMARC records in Cloudflare DNS. Test delivery
  to Gmail and Outlook before issuing addresses. Automated application mail
  remains a separate future Resend configuration.
- cPanel is cheaper but has weaker central user management and deliverability
  support than Microsoft/Google/Zoho. Revisit a dedicated email provider if
  volume, compliance, or deliverability needs grow.

## Redis and performance decision

Redis is useful infrastructure but it does **not** automatically reduce OpenAI
API charges.

- Do not add Redis merely to cache all AI answers. Operations Copilot answers
  use live operational data and may become stale. WhatsApp messages can contain
  personal data and must not be broadly cached.
- Current RAG embedding cost is already controlled: approved knowledge is
  embedded on save/edit/reindex, not on every customer message. Each RAG query
  creates a small query embedding and, where safe, a short draft completion.
- The existing US$15 Operations Copilot and US$10 WhatsApp RAG monthly caps,
  short response limits, grounded retrieval, and mandatory handoffs are the
  main current API-cost protections.
- Add Redis with the production/staging performance foundation when one of
  these is true: background reindexing/email/WhatsApp jobs are enabled,
  multiple API replicas need shared rate limits, measured dashboard reads need
  a short cache, or real traffic demonstrates a bottleneck.
- When introduced, use Redis for rate limits, job queues, short-lived safe
  public-catalogue/dashboard aggregate caches, and cache invalidation after
  product/inventory/order changes. Do not cache payment state, confirmations,
  customer records, or complete AI replies by default.

## Staging and production sequence

1. The client owns the production GoDaddy, Cloudflare, Hetzner, Coolify,
   OpenAI, backup-storage, and eventual payment/Meta accounts. Do not share
   credentials in chat or source control.
2. Create a temporary staging VPS in Umar's account with fictional data and
   test provider keys. Rehearse deployment, migrations, health/readiness,
   authentication, backups, restore, and webhook simulations.
3. Configure an isolated Meta test webhook only after Umar regains Meta
   developer access. Keep intake disabled except for testing and keep all
   outbound WhatsApp sending disabled.
4. Provision fresh production infrastructure in the client account. Run the
   same container configuration and apply migrations only after staging passes.
5. Complete the private production and client-approval gates before enabling
   any public claims, contact details, checkout, payment acceptance, live
   messaging, customer forms, or tracking.
6. After stable production, remove staging secrets/hostname/data and delete
   the temporary VPS deliberately. Retain only necessary, approved evidence.

## Cost categories to recheck before purchase

1. Hetzner VPS, optional snapshots, and IPv4 charges.
2. GoDaddy domain renewal.
3. Malaysian cPanel mail hosting for at least 20 mailboxes.
4. External encrypted backup storage.
5. OpenAI API usage, retained within the configured US$15 + US$10 caps until
   the client approves another budget.
6. Later only: Resend usage, Meta WhatsApp charges, payment processing fees,
   object storage, Cloudflare paid plan, and managed database hosting.

## References to recheck before purchase

- [Cloudflare Registrar and DNS documentation](https://developers.cloudflare.com/registrar/)
- [Coolify self-hosting documentation](https://coolify.io/docs/installation)
- [Hetzner cloud price-adjustment notice](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Zoho Mail pricing](https://www.zoho.com/mail/zohomail-pricing.html)
- [Microsoft 365 Malaysia pricing](https://www.microsoft.com/en-my/microsoft-365/business/microsoft-365-business-basic)
- [OpenAI GPT-4o mini pricing](https://developers.openai.com/api/docs/models/gpt-4o-mini)
