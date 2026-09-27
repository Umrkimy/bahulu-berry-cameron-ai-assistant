# Bahulu Berry Cameron project instructions

- Umar leads this real Malaysian bakery project. Preserve existing work and
  explain consequential choices plainly.
- Use RM/MYR, `Asia/Kuala_Lumpur`, and natural English/Bahasa Melayu. Never
  invent business facts such as products, prices, policies, addresses, hours,
  availability, or delivery terms.
- Admin: React/Vite/Mantine. Storefront: Next.js. API: FastAPI, async
  SQLAlchemy, Alembic, PostgreSQL/pgvector, HttpOnly JWT sessions, and CSRF.
  The backend owns inventory, promotions, totals, orders, and payments.
- Before meaningful product, demo, integration, commit, push, or deployment
  work, read `docs/quality-gate.md`. Other references live under `docs/`.
- Keep secrets, customer data, dumps, reset links, tunnel tokens, and private
  screenshots out of Git, logs, prompts, and public sharing.
- Authorise and validate admin mutations server-side. Verify and deduplicate
  webhooks. Keep AI least-privileged, structured, audited, and human-approved
  for consequential actions; WhatsApp remains draft-only until approved.
- Checkout stays disabled. Public checkout, live payments, customer intake,
  and unapproved content require Umar's and the client's explicit approval.
- Inspect before editing, preserve unrelated changes, and use `apply_patch` for
  manual edits. Test with fictional data in isolated databases.
- Run scoped checks while building and the full relevant gate before push or
  merge. Do not deploy, expose tunnels, call live providers, commit, push, or
  merge unless the current request explicitly authorises it.
