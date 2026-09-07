# Local Operational Acceptance Run

Use this record after starting Docker Desktop. Complete it with fictional data
and Stripe test mode only. Do not write secrets, customer details, payment IDs,
or screenshots containing private information in this file.

**Run date:** ____________________

**Tester:** ____________________

**Environment:** Docker Compose / local test data
**Result:** In progress

## Start and security

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| `docker compose up --build` starts the API, frontend, and database | Passed | Existing PostgreSQL volume preserved. |
| `GET /health` returns healthy | Passed | API returned `{"status":"ok"}`. |
| `GET /ready` confirms database readiness | Passed | API returned `{"status":"ready"}`. |
| Owner and Staff can sign in; inactive account is rejected | passed | |
| Sign-out and expired/invalid session return safely to sign-in | passed | |
| State-changing request without a CSRF token is rejected | ☐ | |

## Daily operations

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Owner creates a product and its inventory appears | passed | |
| Staff adjusts stock up and down; valid changes are logged | ☐ | |
| Percentage, fixed, and bundle promotions quote correctly | passed | |
| Scheduled, active, and expired promotion states are correct | passed | |
| Customer order quote matches the saved order snapshot | passed | |
| Stock deducts once on order creation and restores once on eligible cancellation | passed | |
| Staff updates delivery details and the activity history is safe | ☐ | |
| Orders, inventory, discounts, alerts, and reports display correctly | passed | |

## Payments and refunds

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Stripe CLI forwards signed test webhooks to the local API | passed | |
| Owner generates a test payment link for an eligible unpaid order | passed | |
| Test checkout updates the payment and order to `PAID` exactly once | passed | |
| Duplicate webhook delivery does not duplicate payment state or activity | ☐ | |
| Owner records, approves, and executes an eligible test refund | passed | |
| Refunded payment/order state, Malaysia time, and activity entry are correct | passed | |
| Duplicate refund is rejected without a second provider action or audit entry | passed | |
| Staff can create payment links but cannot approve or execute refunds | Passed | Intended Staff payment-link permission verified; refund approval/execution remains Owner-only. |

## Support and AI

| Check | Result | Defect reference / safe note |
| --- | --- | --- |
| Staff creates, assigns, updates, resolves, and closes a support ticket | ☐ | |
| Ticket notes, activity, filters, and drawer work correctly | passed | |
| Human takeover can be claimed, returned to AI, reopened, and protected from unassigned Staff actions | ☐ | |
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
| `backend/.venv/Scripts/python.exe -m pytest` | Passed | 39 tests passed. |
| `frontend/npm run test` | Passed | 7 tests passed. |
| `frontend/npm run test:e2e` | Passed | Desktop and mobile sign-in smoke tests passed. |
| `frontend/npm run build` | Passed | Local and fresh Docker builds passed. |
| `frontend/npm run lint` | Passed | No errors or warnings. |
| `frontend/npm audit --omit=dev --audit-level=high` | Passed | No production dependency vulnerabilities found. |

## Sign-off

All failed checks have a reproducible defect reference and are fixed or
explicitly deferred before this run is marked **Passed**.

**Owner/tester sign-off:** ____________________
**Date:** ____________________
