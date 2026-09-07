# Local Operational Acceptance Run

Use this record after starting Docker Desktop. Complete it with fictional data
and Stripe test mode only. Do not write secrets, customer details, payment IDs,
or screenshots containing private information in this file.

**Run date:** 2026-09-08 (automated pass)

**Tester:** ____________________

**Current milestone note:** Backup/restore and local staging checks are added
below after their automated rehearsal. Stripe, microphone, and visual browser
checks remain deferred until Umar verifies them.

**Environment:** Docker Compose / local test data
**Result:** Partial — automated validation re-run on 2026-09-08; browser-only checks remain deferred for Umar.

## Start and security

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| `docker compose up --build` starts the API, frontend, and database | Passed | Existing PostgreSQL volume preserved. |
| `GET /health` returns healthy | Passed | Rechecked on 2026-09-08; API returned `{"status":"ok"}`. |
| `GET /ready` confirms database readiness | Passed | Rechecked on 2026-09-08; API returned `{"status":"ready"}`. |
| Docker environment is development, uses a Stripe test key, and has Meta inbound disabled | Passed | Verified through boolean-only container checks; no secret values recorded. |
| Owner and Staff can sign in; inactive account is rejected | passed | |
| Sign-out and expired/invalid session return safely to sign-in | passed | |
| State-changing request without a CSRF token is rejected | Deferred | Requires Umar browser/API verification. |

## Daily operations

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Owner creates a product and its inventory appears | passed | |
| Staff adjusts stock up and down; valid changes are logged | Deferred | Requires Umar browser verification. |
| Percentage, fixed, and bundle promotions quote correctly | passed | |
| Scheduled, active, and expired promotion states are correct | passed | |
| Customer order quote matches the saved order snapshot | passed | |
| Stock deducts once on order creation and restores once on eligible cancellation | passed | |
| Staff updates delivery details and the activity history is safe | Deferred | Requires Umar browser verification. |
| Orders, inventory, discounts, alerts, and reports display correctly | passed | |

## Payments and refunds

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Stripe CLI forwards signed test webhooks to the local API | passed | |
| Owner generates a test payment link for an eligible unpaid order | passed | |
| Test checkout updates the payment and order to `PAID` exactly once | passed | |
| Duplicate webhook delivery does not duplicate payment state or activity | Deferred | Requires Umar Stripe CLI verification. |
| Owner records, approves, and executes an eligible test refund | passed | |
| Refunded payment/order state, Malaysia time, and activity entry are correct | passed | |
| Duplicate refund is rejected without a second provider action or audit entry | passed | |
| Staff can create payment links but cannot approve or execute refunds | Passed | Intended Staff payment-link permission verified; refund approval/execution remains Owner-only. |

## Support and AI

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Staff creates, assigns, updates, resolves, and closes a support ticket | Deferred | Requires Umar browser verification. |
| Ticket notes, activity, filters, and drawer work correctly | passed | |
| Human takeover can be claimed, returned to AI, reopened, and protected from unassigned Staff actions | Deferred | Requires Umar browser verification. |
| Approved support content produces a cited internal draft only | Deferred | Requires Umar browser verification. |
| Unknown, sensitive, payment, delivery, complaint, and human requests require handoff | Deferred | Requires Umar browser verification. |
| Repeated fictional simulator message is idempotent | Deferred | Requires Umar browser verification. |
| Staff AI answers read-only operations questions and cannot alter records | Deferred | Requires Umar browser verification. |
| Owner AI confirmations, usage budget, and rate limits behave correctly | Deferred | Requires Umar browser verification. |
| Meta inbound intake remains disabled | Deferred | Requires Owner readiness-screen verification; environment values are not inspected. |

## Roles and responsive checks

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Staff receives permission denial for Team, exports, product/promotion changes, cancellation, payment/refund actions, settings, and consequential AI actions | Deferred | Requires Umar browser verification. |
| Owner-only navigation and reports remain hidden from Staff | Deferred | Requires Umar browser verification. |
| Dashboard, order creation, ticket workspace, and AI chat work at 360px | Deferred | Requires Umar browser verification. |
| Same workflows remain usable at 768px and desktop width | Deferred | Requires Umar browser verification. |
| Dictation works in Chrome and recognised text waits for Send | Deferred | Requires Umar Chrome verification. |

## Automated evidence

| Command | Result | Safe note |
| --- | --- | --- |
| `backend/.venv/Scripts/python.exe -m pytest` | Passed | 61 passed; 2 PostgreSQL-only tests skipped on SQLite, re-run 2026-09-08. |
| Full backend suite on isolated PostgreSQL 16 | Passed | 52 passed, including concurrent budget, dispatch, confirmation and message-idempotency cases. Existing Compose volume untouched. |
| `frontend/npm run test` | Passed | 13 tests passed on 2026-09-08. |
| `frontend/npm run test:e2e` | Passed | 10 mocked browser tests: sign-in, Staff AI privacy and fulfilment selected-record/filter behaviour at 360/768/1280px. Not a full manual workflow sign-off. |
| `frontend/npm run build` | Passed | Production build passed on 2026-09-08; existing ECharts chunk-size warning is non-blocking. |
| `frontend/npm run lint` | Passed | No errors or warnings on 2026-09-08. |
| `frontend/npm audit --omit=dev --audit-level=high` | Passed | No production dependency vulnerabilities found on 2026-09-07. |
| `uvx bandit -r app -q` | Passed | No static-security findings, re-run 2026-09-08. |
| `uv export --locked --no-dev ... | uvx pip-audit` | Passed | No known backend dependency vulnerabilities, re-run 2026-09-08 using a temporary exported requirements file. |
| `npm audit --audit-level=high` | Passed | No findings including development dependencies, re-run 2026-09-08. |
| Gitleaks history, current diff and untracked source scan | Passed | Two historical literal CI placeholders verified and excluded by exact fingerprints only; no real secrets detected. `.agents/` excluded from source review. |
| Clean PostgreSQL `alembic upgrade head` | Passed | Reproduced/fixed dynamic baseline duplicate-table failure. Static baseline now upgrades through 0018. |
| Rebuilt Compose health, readiness and revision | Passed | Rebuilt on 2026-09-08 with the existing volume retained; revision 0019; test Stripe key and disabled Meta intake verified using boolean-only checks. |
| Current local Gitleaks scan | Deferred | Gitleaks is not installed locally. Existing GitHub Actions secret-scan configuration remains the recurring gate; do not mark a local re-run as passed until the tool is available. |
| Current tracked/untracked source secret scan | Passed | No leaks in source changes. `.gitleaksignore` is excluded from stdin scanning because it intentionally contains two historical Gitleaks fingerprints, not credentials. |
| Local backup and disposable restore rehearsal | Passed | Rehearsed on 2026-09-08 using the existing test database. A compressed dump restored into a random disposable database, migrated through 0019, passed the application connection check, and was removed; the active volume was unchanged. |
| Local staging-style Compose startup | Passed | Rehearsed on 2026-09-08 with isolated `bahulu-staging` project and database volume. Explicit migration completed; API `/health` and `/ready` passed on port 18000 while the normal stack stayed healthy on port 8000. |

## Quality review follow-up — 2026-09-07

Confirmed and fixed: shipped deliveries reverting orders to processing; dispatch dropping omitted tracking details; concurrent dispatch/confirmation/budget/intake races; missing active task-assignee validation and task activity privacy; unsafe malformed field-error handling; AI history shared across accounts; AI drafts during human takeover; stock threshold saves separated from stock movements.

AI responses now distinguish pending confirmation, successful action, and failure. Provider timeouts retain uncertain budget reservations rather than promising unused cost. Chat history is account-scoped session storage and cleared on sign-out. Stock reductions require a reason and UI confirmation. Fulfilment opens the selected record in place, retaining filters; delivery and order statuses are displayed separately.

The baseline migration is now a frozen schema snapshot instead of importing current model metadata. This preserves already-stamped databases and prevents future models silently entering the baseline. Fresh upgrade passed in a disposable database.

Run message-content cleanup daily using the container's installed Python (plain `uv run` attempts to install development packages in the non-root image):

```powershell
docker compose exec -T api .venv/bin/python -m app.cleanup_messages
```

For a future host, schedule this command daily in the deployment directory. No operating-system scheduled task was installed during this review. Expired timeline content is already cleared/hidden when read. Cleanup keeps metadata and audit history; expired message bodies are intentionally not recoverable from the application.

Remaining validation: Umar's Chrome microphone, real browser Stripe test checkout/webhook/refund, and complete Owner/Staff visual acceptance on every page. Earlier manual results above are retained, not claimed as re-executed in this pass. Live Meta/outbound messaging remains disabled. Hosted GitHub Actions was not triggered; configured checks were run locally.

Non-blocking follow-ups: existing large initial/ECharts chunk warnings and Python dependency deprecations remain visible. Before deployment, prioritise a backup/restore rehearsal, scheduled retention cleanup, and a measured frontend bundle review. No new package or business feature is recommended until manual acceptance is complete.

## Sign-off

All failed checks have a reproducible defect reference and are fixed or
explicitly deferred before this run is marked **Passed**.

**Owner/tester sign-off:** ____________________
**Date:** ____________________
