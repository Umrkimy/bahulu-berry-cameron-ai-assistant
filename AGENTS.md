# Bahulu Berry Cameron project instructions

## Product and collaboration

- Umar leads this real Malaysian bakery project. Preserve existing work and
  explain consequential recommendations in plain language.
- Use RM/MYR, `Asia/Kuala_Lumpur`, and natural English/Bahasa Melayu support.
- Prefer secure, dependable, maintainable production foundations over demos or
  shortcuts. Do not invent products, prices, policies, addresses, opening
  hours, availability, delivery terms, or other business claims.

## Architecture

- Admin: React, TypeScript, Vite, Mantine, React Router, and TanStack Query.
- Storefront: Next.js, React, TypeScript, bilingual catalogue and private
  checkout review.
- API: FastAPI, async SQLAlchemy, Alembic, PostgreSQL/pgvector, and JWT-backed
  HttpOnly admin sessions with CSRF protection.
- Inventory, promotions, totals, orders, and payments are backend-authoritative.

## Mandatory safeguards

- Read `docs/quality-gate.md` before meaningful product, demo, integration,
  commit, push, or deployment work.
- Keep secrets, customer data, database dumps, reset links, tunnel tokens, and
  private screenshots out of Git, logs, prompts, and public sharing.
- Validate and authorise every admin mutation server-side. Protect webhooks
  with signature verification and idempotency.
- AI uses structured tools, least privilege, audit trails, and human approval
  for consequential actions. WhatsApp remains draft-only until approved.
- Checkout stays disabled by default. Never enable public checkout, live
  payments, customer intake, or unapproved public content without Umar's and
  the client's explicit approval.

## Working rules

- Inspect before editing. Preserve unrelated changes and use `apply_patch` for
  manual file edits.
- Use fictional data and isolated databases for tests. Never point destructive
  fixtures at the working database.
- Use the smallest useful check while building, then the full relevant
  test/lint/build/security/integration gate before push or merge.
- Do not deploy, expose a tunnel, make live provider calls, commit, push, or
  merge unless the current request explicitly authorises it.
- Operational, storefront, security, deployment, and demo references live in
  `docs/`; keep this always-loaded file concise.
