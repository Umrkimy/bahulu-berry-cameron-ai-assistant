# Bahulu Berry Cameron AI Operations Platform

Secure operations platform for a Malaysian bakery. Real credentials, customer
records, payment details, contacts, and unconfirmed business details are kept
out of source control.

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
- Owner-only reports and responsive operational views for desktop, tablet, and
  phone, including Apache ECharts sales and fulfilment visualisations.
- Calm, reduced-motion-aware UI feedback, safe dashboard crash recovery, and
  automated frontend/browser regression checks.

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
cd ../frontend; npm run test; npm run test:e2e; npm run build; npm audit --omit=dev --audit-level=high
```

The dashboard uses `react-error-boundary` to show a safe recovery screen if a
route fails. Vitest/MSW cover deterministic UI and API states, while Playwright
checks the sign-in experience at desktop and mobile sizes. These tests use mock
data and never call Stripe or production services.

Compose runs Alembic migrations before the API starts. Production should use a
managed, client-owned PostgreSQL database and an explicit migration job.

## Safe local demo data

The optional local demo seed creates clearly fictional records for development,
testing, and interface review. It never imports or changes client records. See
the [local demo guide](LOCAL_DEMO_GUIDE.md) for the opt-in command and safe
Docker reset instructions.

Do not commit `.env` files, API keys, webhook secrets, real addresses, phone
numbers, payment identifiers, or approved business content.
