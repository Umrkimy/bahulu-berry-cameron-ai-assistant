# Local Operational Acceptance Run

Use this record after starting Docker Desktop. Complete it with fictional data
and Stripe test mode only. Do not write secrets, customer details, payment IDs,
or screenshots containing private information in this file.

**Run date:** ____________________

**Tester:** ____________________

**Environment:** Docker Compose / local test data
**Result:** Not started / Passed / Failed

## Start and security

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| `docker compose up --build` starts the API, frontend, and database | ☐ | |
| `GET /health` returns healthy | ☐ | |
| `GET /ready` confirms database readiness | ☐ | |
| Owner and Staff can sign in; inactive account is rejected | ☐ | |
| Sign-out and expired/invalid session return safely to sign-in | ☐ | |
| State-changing request without a CSRF token is rejected | ☐ | |

## Daily operations

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Owner creates a product and its inventory appears | ☐ | |
| Staff adjusts stock up and down; valid changes are logged | ☐ | |
| Percentage, fixed, and bundle promotions quote correctly | ☐ | |
| Scheduled, active, and expired promotion states are correct | ☐ | |
| Customer order quote matches the saved order snapshot | ☐ | |
| Stock deducts once on order creation and restores once on eligible cancellation | ☐ | |
| Staff updates delivery details and the activity history is safe | ☐ | |
| Orders, inventory, discounts, alerts, and reports display correctly | ☐ | |

## Payments and refunds

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Stripe CLI forwards signed test webhooks to the local API | ☐ | |
| Owner generates a test payment link for an eligible unpaid order | ☐ | |
| Test checkout updates the payment and order to `PAID` exactly once | ☐ | |
| Duplicate webhook delivery does not duplicate payment state or activity | ☐ | |
| Owner records, approves, and executes an eligible test refund | ☐ | |
| Refunded payment/order state, Malaysia time, and activity entry are correct | ☐ | |
| Duplicate refund is rejected without a second provider action or audit entry | ☐ | |
| Staff cannot create payment links, approve refunds, or execute refunds | ☐ | |

## Support and AI

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Staff creates, assigns, updates, resolves, and closes a support ticket | ☐ | |
| Ticket notes, activity, filters, and drawer work correctly | ☐ | |
| Approved support content produces a cited internal draft only | ☐ | |
| Unknown, sensitive, payment, delivery, complaint, and human requests require handoff | ☐ | |
| Repeated fictional simulator message is idempotent | ☐ | |
| Staff AI answers read-only operations questions and cannot alter records | ☐ | |
| Owner AI confirmations, usage budget, and rate limits behave correctly | ☐ | |
| Meta inbound intake remains disabled | ☐ | |

## Roles and responsive checks

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Staff receives permission denial for Team, exports, product/promotion changes, cancellation, payment/refund actions, settings, and consequential AI actions | ☐ | |
| Owner-only navigation and reports remain hidden from Staff | ☐ | |
| Dashboard, order creation, ticket workspace, and AI chat work at 360px | ☐ | |
| Same workflows remain usable at 768px and desktop width | ☐ | |
| Dictation works in Chrome and recognised text waits for Send | ☐ | |

## Automated evidence

| Command | Result | Safe note |
| --- | --- | --- |
| `backend/.venv/Scripts/python.exe -m pytest` | ☐ | |
| `frontend/npm run test` | ☐ | |
| `frontend/npm run test:e2e` | ☐ | |
| `frontend/npm run build` | ☐ | |
| `frontend/npm audit --omit=dev --audit-level=high` | ☐ | |

## Sign-off

All failed checks have a reproducible defect reference and are fixed or
explicitly deferred before this run is marked **Passed**.

**Owner/tester sign-off:** ____________________
**Date:** ____________________
