# Bahulu Berry Cameron AI Operations Platform

Portfolio-safe demonstration of a secure operations platform for a Malaysian bakery. Real client credentials, customer data, and unconfirmed business details are excluded.

## What it demonstrates

- React/Mantine admin dashboard with owner and staff permissions.
- FastAPI operational APIs for customers, inventory, promotions, orders, deliveries, payments, and refunds.
- Backend-authoritative pricing and inventory, verified payment webhooks, and activity auditing.
- Secure cookie sessions, CSRF protection, rate controls, safe error handling, and CI security checks.
- Bilingual support workspace with approved-content controls, a grounded reply-draft copilot, source labels, and safety-first human handoffs.
- Versioned local AI evaluation cases that do not require paid model calls or customer data.

## Architecture

```text
React admin dashboard ── secure cookie + CSRF ──> FastAPI API ──> PostgreSQL
                                                     │
                                                     ├── Stripe test webhooks
                                                     └── Grounded support retrieval
                                                         (owner-approved FAQs/templates only)
```

The future WhatsApp adapter will call the same approved-content retrieval service. It is not connected in this repository, and the current copilot never sends customer messages.

## API overview

Authenticated `/api` routes cover administration, customers, products, inventory, orders, deliveries, promotions, payments, refunds, activity history, team roles, and internal support. The support-specific routes provide owner-managed approved content, staff queue operations, safe assignee lookup, and `POST /api/support/copilot/draft` for source-grounded drafts.

## Security and AI safety

| Risk | Control |
| --- | --- |
| Account/session theft | HttpOnly secure session cookies, CSRF checks, session expiry, rate controls, and owner/staff server-side permissions. |
| Incorrect prices or stock | Backend-authoritative pricing, inventory transactions, promotion snapshots, and audited state changes. |
| Unsafe AI action | Owner-only consequential tools, stored confirmation previews, and activity logging. |
| Invented customer-support facts | The support copilot retrieves active owner-approved records only; otherwise it requires human handoff. |
| Sensitive customer data in portfolio/AI tests | Demo and evaluation fixtures are fictional; private conversations, secrets, payment/card data, and addresses are excluded from telemetry. |

## AI cost controls

The paid dashboard assistant defaults to `gpt-4o-mini`. Each provider call creates a safe usage-ledger entry with token counts and estimated cost, but never stores chat text. The backend reserves a bounded worst-case cost before calling OpenAI and stops requests when the configured US$8 monthly cap is reached. Owners can review this as an approximate RM display in **AI Usage & Budget**. The deterministic support copilot uses approved database content and does not call a paid model.

## Short demo flow

1. Sign in as an Owner and add a fictional bilingual FAQ under **WhatsApp Support → Approved content**.
2. Use **Draft reply** with a matching question and show its source label.
3. Enter a refund, delivery, complaint, or “I need a person” message and show the required human handoff.
4. Create a manual support request, assign it, update its status, and show the activity log.
5. Demonstrate an operational flow: promotion → quoted order → test payment → webhook → owner refund request.
6. Switch to a Staff account to demonstrate the server-enforced owner-only controls.

## Local production-like run

1. Copy `.env.example` to `.env` and replace placeholders with local test values.
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`; API health is available at `http://localhost:8000/health` and readiness at `/ready`.

Compose runs Alembic migrations before the API starts. The PostgreSQL volume is local-only; use a managed, client-owned PostgreSQL database and a separate explicit migration job for production.

## Validation

Backend tests, frontend production build, dependency checks, static security checks, and secret scanning run in GitHub Actions. The support-copilot evaluation dataset is fictional and tests grounding, bilingual retrieval, handoff decisions, and resistance to unapproved answers.

## Safe demo notes

Use fictional products, customers, and test payment credentials in screenshots or demos. Do not publish `.env` files, API keys, webhook secrets, real addresses, phone numbers, or client-approved content without permission.
