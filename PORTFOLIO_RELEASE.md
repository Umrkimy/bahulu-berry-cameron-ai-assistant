# Portfolio release guide

This repository remains the private working project. Create a new repository or
redacted branch for public portfolio material; do not make this client history
public. Publish only after the client and Umar approve the code and design
material being shown.

## Fictional demo data

The seed command is deliberately opt-in and idempotent. It adds missing records
only; it does not delete or overwrite data.

```powershell
cd backend
uv run python -m app.demo_seed --fictional-demo
```

It creates fictional Owner and Staff accounts plus a fictional product,
inventory, promotion, order, payment, refund request, approved support content,
ticket, note, and simulator event. The `.invalid` email domain, test passwords,
and product copy are public demo-only values.

For a fresh local SQLite demo, remove only the local demo database you created,
run `uv run alembic upgrade head`, then run the command above. Never delete a
database containing client records.

For Docker PostgreSQL:

```powershell
docker compose up --build
docker compose exec api python -m app.demo_seed --fictional-demo
```

To reset a disposable Docker demo stack, first confirm it has no client data,
then run `docker compose down -v`, start Compose again, and seed it. The volume
deletion is irreversible.

## Screenshot checklist

Capture only after seeding a clean fictional environment. Put approved images
in the separate public repository, not this client repository.

- Dashboard overview with fictional metrics.
- Product promotion and saved order pricing snapshot.
- Owner and Staff views showing restricted controls.
- Support ticket drawer with a fictional internal note.
- Grounded draft with its approved source label.
- Owner-only message simulator returning a fictional handoff.
- `GET /health` and `GET /ready` from the Docker stack.

Before publishing, inspect every image at full size for browser autofill,
contacts, tokens, payment IDs, file paths, or real product details.

## Five-minute interview demo

1. Sign in as the fictional Owner and open **Team & Roles**.
2. Show a product promotion, quote an order, and explain that totals are saved
   as historical snapshots.
3. Open the fictional refund request and point out Owner-only approval.
4. Open WhatsApp Support, draft a reply, and show the approved source citation.
5. Enter a fictional request for a person in the simulator and show the high
   priority internal handoff ticket.
6. Sign in as fictional Staff and show that server-side permissions hide and
   reject Owner-only refunds, promotions, exports, team management, and the
   simulator.
7. Open AI Usage & Budget and explain the backend cap and safe telemetry.

## Threat model summary

| Area | Main risk | Mitigation |
| --- | --- | --- |
| Sessions | Browser token theft and CSRF | HttpOnly session cookie, CSRF token, expiry, security headers, and explicit production origins. |
| Permissions | Staff changing high-impact records | Backend Owner/Staff checks, confirmation workflows, and activity logging. |
| Payments | Forged or repeated provider events | Stripe signature verification, idempotency, and payment state transitions controlled server-side. |
| Secrets | Credentials in source or screenshots | Environment variables, ignore rules, example placeholders, CI scanning, and release inspection. |
| AI | Invented answers or unauthorised tools | Owner-approved retrieval only, citations, human handoff, confirmations, audit entries, and an AI budget cap. |
| Future WhatsApp | Unverified inbound messages and over-retention | Provider-neutral boundary, payload hashes only, idempotency records, and no live webhook or sending until policies are approved. |
