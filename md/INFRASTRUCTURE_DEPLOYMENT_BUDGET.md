# Infrastructure Deployment and Budget Reference

**Status:** Planning estimate only. Not an approved purchase order, production
deployment plan, or public business claim.

**Last reviewed:** 12 September 2026

This document records the currently recommended hosting approach for Bahulu
Berry Cameron. Reconfirm prices, taxes, provider availability, account
ownership, and the product quality gate before provisioning any service.

## Recommended deployment shape

```text
Customers
  -> Cloudflare (DNS, TLS, edge protection)
  -> Vercel (admin and storefront frontends)
  -> Hetzner Singapore VPS (Coolify-managed FastAPI API and future worker)
  -> Neon PostgreSQL Singapore
  -> Cloudflare R2 (approved media and encrypted off-server backups)
```

- **Coolify Cloud** is the deployment control plane. It provides dashboard-based
  application deployment, secrets, logs, domains, TLS, health checks, and
  container management; it does not replace the VPS provider or the need for
  secure server, workload, and backup operations.
- **Hetzner Singapore** is preferred for Malaysia-friendly latency and value.
- **Neon Singapore** keeps the production PostgreSQL database separately
  managed from the API VPS.
- **Vercel** continues to host the existing frontend applications, as planned
  in the project architecture. Do not duplicate their hosting on the API VPS.
- **Cloudflare R2** is for approved uploaded media and off-server recovery
  copies, not an excuse to skip restore testing.

## Monthly budget after staging is deleted

The intended workflow is to create a private staging VPS first, perform the
deployment rehearsal, then delete that VPS after production is stable. A
powered-off Hetzner server can remain billable, so deletion must be deliberate
and backups or snapshots must be retained only where intended.

The figures below use the Bank Negara Malaysia USD/MYR reference of about
**USD 1 = RM 4.07** on 11 September 2026. They exclude tax and are planning
figures, not a price guarantee.

### Cost-conscious launch option

| Item | Assumption | Estimate |
| --- | --- | ---: |
| Production VPS | Hetzner Singapore CPX22 | USD 30.99 / about RM 126 |
| Deployment control plane | Coolify Cloud, up to two server slots | USD 5.00 / about RM 20 |
| Production database | Neon Launch, conservative early budget | USD 15.00 / about RM 61 |
| Business frontend hosting | Vercel Pro starting allowance | USD 20.00 / about RM 81 |
| Early object storage and email | Low R2 and Resend usage | RM 0 to RM 41 |
| **Estimated platform total** | Before tax and usage overages | **about RM 288 to RM 330 / month** |

Start here for approximately 10,000 monthly visitors. This is not 10,000
simultaneous customers or 10,000 completed orders. Monitor CPU, memory, API
latency, error rate, database load, and background-job backlog before scaling.

### Higher-headroom production option

| Item | Assumption | Estimate |
| --- | --- | ---: |
| Production VPS | Hetzner Singapore CCX13, 2 dedicated vCPU and 8 GB RAM | USD 63.49 / about RM 258 |
| Other platform services | Coolify Cloud, Neon, Vercel, low R2/Resend usage | about RM 162 to RM 203 |
| **Estimated platform total** | Before tax and usage overages | **about RM 420 to RM 460 / month** |

Choose this option only if measured production activity requires dedicated CPU
or more memory. The normal upgrade path is CPX22 first, then CCX13 when
observed metrics justify it.

## Costs not included above

- Domain registration and renewal.
- Applicable Malaysian taxes, provider IPv4 charges, and optional VPS
  snapshots or backups.
- Resend overages, OpenAI API usage, monitoring services, and support plans.
- Payment processing. This is variable and may become the largest cost once
  checkout is live. Stripe Malaysia's listed standard domestic card and FPX
  rate is 3% plus RM 1.00 per successful transaction; recheck provider terms
  before choosing or launching a payment provider.

Example only: 500 completed RM 30 orders would incur approximately RM 950 in
Stripe processing fees at that rate. This example is not a forecast of Bahulu
Berry Cameron order volume, sales, or prices.

## Staging and production sequence

1. Create client-owned Hetzner, Coolify, Neon, Cloudflare, Vercel, Resend, and
   payment-provider accounts. Do not share credentials in chat or source code.
2. Provision a staging VPS and separate staging database with fictional data
   and test provider keys only.
3. Deploy the same container configuration intended for production. Verify
   migrations, health/readiness endpoints, authentication, password reset,
   email behaviour, webhook simulations, backup creation, and a restore test.
4. Provision a fresh production database and production VPS. Apply migrations
   only after the staging rehearsal passes.
5. Complete the private production launch checks in `PRODUCT_QUALITY_GATE.md`.
   Do not enable unapproved public checkout, payment acceptance, WhatsApp
   intake, customer forms, marketing tracking, or business claims.
6. After production is stable, export and retain only necessary staging
   evidence, then delete the staging VPS and staging database according to the
   agreed retention plan. Remove staging secrets and DNS records.
7. Continue monitoring production and perform a backup restore rehearsal at
   least quarterly.

## Meta WhatsApp staging inbound test

This is a controlled, draft-only rehearsal using a temporary Meta app, test
phone number, and approved test recipient. It does not authorise live customer
support, outbound messaging, or use of a production Meta account.

- Leave `WHATSAPP_META_INBOUND_ENABLED=false` by default. Enable it only for
  the test window through the ignored staging environment file or host secret
  manager.
- Store `WHATSAPP_META_APP_SECRET`, `WHATSAPP_META_VERIFY_TOKEN`, and
  `WHATSAPP_META_PHONE_NUMBER_ID` only in that staging secret store.
- Set Meta's callback to
  `https://wa-staging.<controlled-domain>/webhooks/meta/whatsapp` and subscribe
  only to `messages`. Route that hostname to the API, include it in
  `STAGING_TRUSTED_HOSTS`, and protect every non-webhook path at the edge.
- Verify one signed fictional message creates a grounded draft and an explicit
  human request creates a handoff ticket. The status must remain `DRAFT_ONLY`
  with outbound messaging disabled.
- Disable intake, remove the Meta subscription, rotate staging secrets, and
  remove the temporary hostname when the staging environment is retired.

## Sources to recheck before purchase

- [Bank Negara Malaysia USD/MYR reference rate](https://www.bnm.gov.my/kuala-lumpur-usd/myr-reference-rate)
- [Hetzner Singapore price adjustment list](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Coolify Cloud pricing](https://coolify.io/docs/get-started/cloud)
- [Neon pricing](https://neon.com/pricing)
- [Vercel pricing](https://vercel.com/pricing)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Stripe Malaysia pricing](https://stripe.com/en-my/pricing)
