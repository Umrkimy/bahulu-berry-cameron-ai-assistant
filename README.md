# Bahulu Berry Cameron AI Operations Platform

Portfolio-safe technical demonstration of a secure operations platform for a
Malaysian bakery. Real client credentials, customers, payments, contacts, and
unconfirmed business details are excluded.

## What it demonstrates

- React, TypeScript, Vite, Mantine, TanStack Query, and TanStack Table.
- FastAPI, async SQLAlchemy, Alembic, PostgreSQL-compatible persistence, and
  secure owner/staff role controls.
- Backend-authoritative inventory, promotion pricing, historical order
  snapshots, deliveries, Stripe test payments, refund requests, and audit logs.
- HttpOnly cookie sessions, CSRF protection, request limits, safe errors,
  dependency checks, secret scanning, and GitHub Actions checks.
- A bilingual internal support workspace with approved-content controls,
  grounded cited drafts, human handoffs, and a provider-neutral simulator.
- AI cost controls for `gpt-4o-mini`: safe usage telemetry, fixed request
  limits, warning threshold, and a backend-enforced monthly budget cap.

## Architecture

```text
React admin dashboard -- secure cookie + CSRF --> FastAPI API --> PostgreSQL
                                                   |
                                                   +-- Stripe test webhooks
                                                   +-- Grounded support retrieval
                                                       (owner-approved records only)
```

The provider-neutral messaging boundary is ready for a future WhatsApp
integration. It is not connected to Meta in this repository and never sends a
customer message.

## Security and AI model

| Risk | Control |
| --- | --- |
| Session theft and CSRF | HttpOnly session cookie, CSRF token, expiry, trusted origins, and rate controls. |
| Incorrect price or stock | Server-side pricing and stock transactions with historical order snapshots. |
| Staff overreach | Server-enforced Owner/Staff permissions, confirmation flows, and activity logging. |
| Forged payment events | Stripe signature verification, idempotency, and backend-owned payment transitions. |
| Invented support answers | Active Owner-approved records only; missing or risky questions become human handoffs. |
| AI overspend | Safe usage ledger and an enforced monthly provider cap before a paid request is sent. |

## Local run and validation

1. Copy `.env.example` to `.env` and use local test values only.
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`. API checks are at
   `http://localhost:8000/health` and `http://localhost:8000/ready`.

Useful checks:

```powershell
cd backend; uv run pytest
cd ../frontend; npm run build; npm audit --omit=dev --audit-level=high
```

Compose runs Alembic migrations before the API starts. Production should use a
managed, client-owned PostgreSQL database and an explicit migration job.

## Public portfolio release

This repository is the private client working project. Prepare a new redacted
repository or branch with clean history for any public portfolio; do not publish
until Umar and the client approve what is being shared. Use only fictional seed
data and approved screenshots. The [portfolio release guide](PORTFOLIO_RELEASE.md)
contains the opt-in seed command, Docker reset notes, screenshot checklist,
five-minute interview demo, and threat-model summary.

Do not publish `.env` files, API keys, webhook secrets, real addresses, phone
numbers, payment identifiers, or client-approved business content without
explicit permission.
