# Continuation Context

## Current checkpoint

- September 2026 checkpoint: approved yellow/cream storefront design connected
  to the real product backend, Owner photo galleries and homepage selection.
  See `storefront/PRODUCT_WORKFLOW.md` for implementation and verification.
- Umar authorised a feature PR and merge for this checkpoint. Check Git status
  and PR state rather than assuming an old commit is current.
- Leave the untracked `.agents/` directory untouched.
- Read `md/PRODUCT_QUALITY_GATE.md` before any meaningful feature, demo,
  integration, commit, or deployment work.

## Product boundaries

- This is a real Malaysian bakery client project. Use RM and
  `Asia/Kuala_Lumpur`; support English and Bahasa Melayu.
- The Cloudflare demo is private and uses fictional records only. Do not add
  public claims, checkout, real payments, real customer intake, or automated
  WhatsApp replies without the client-approval gate.
- Never place customer data, API keys, JWT secrets, provider secrets, or
  payment identifiers in Git, logs, screenshots, prompts, or demo material.

## Working system

- Admin: React/TypeScript/Vite/Mantine/TanStack Query.
- API: FastAPI, async SQLAlchemy, PostgreSQL 16 with pgvector, JWT cookie
  sessions and CSRF protection.
- Local/private-demo stack: Docker Compose with `db`, `migrate`, `api`,
  `frontend`, `storefront`, and Cloudflare Tunnel.
- Operations Copilot: `gpt-4o-mini`, Staff read-only, Owner actions require a
  preview and interactive confirm/cancel. Internal monthly cap: US$15.
- WhatsApp workspace: provider-neutral simulator and prepared Meta intake;
  outbound messaging remains disabled.

## Semantic WhatsApp RAG

- Enabled only when `WHATSAPP_RAG_ENABLED=true`; default is off.
- Uses `text-embedding-3-small`, pgvector cosine search, same-language active
  approved FAQ/template/Knowledge Article chunks, top 3 sources, threshold
  `0.72`, and `gpt-4o-mini` drafts capped at 180 completion tokens.
- It drafts only from cited approved content. Low confidence, model/budget
  errors, sensitive topics (payment/refund/order/delivery/complaint/allergy),
  or an explicit request for a person create a human handoff instead.
- Separate WhatsApp RAG monthly cap: US$10. It does not consume the Operations
  Copilot cap.
- Owner content changes re-embed the affected source. Reindex is a repair
  control for rebuilding every approved-content embedding after a migration or
  suspected index issue; it is not required after normal edits.

## Demo and deployment status

- Private demo: `https://demo.bahuluberrycameron.com`, protected by Cloudflare
  Access. Docker services were healthy after the RAG checkpoint.
- Demo walkthrough: `md/CLIENT_DEMO_SCRIPT.md`. Use fictional content only.
- Meta phone verification is currently blocked. Do not configure a real Meta
  app, webhook, or secrets until Umar has access again.
- Proposed hosting direction: Coolify on a Hetzner VPS, with staging in Umar's
  account and eventual production in the client's account. No production
  deployment is authorised yet.

## Next sensible steps

1. Continue with `md/SOL_HANDOFF.md`: homepage refinements, cart and a private
   checkout/payment preview. Live payments and public checkout remain gated.
2. When Meta access works, configure the isolated Meta test webhook staging
   plan; keep outbound disabled.
3. Prepare production checklist, client-owned accounts, backups, monitoring,
   and approval material only when production is authorised.
