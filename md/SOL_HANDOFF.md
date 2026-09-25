# Sol handoff: homepage, cart and checkout preview

Copy the following prompt into a new Sol session:

---

Continue the Bahulu Berry Cameron project in
`D:\Stuff\Coding\bahulu-cameron-ai-assistant`.

Read AGENTS.md, md/PRODUCT_QUALITY_GATE.md, md/CONTINUATION_CONTEXT.md,
md/OWNER_OPERATIONS_RUNBOOK.md, md/CLIENT_DEMO_SCRIPT.md,
md/INFRASTRUCTURE_DEPLOYMENT_BUDGET.md and storefront/PRODUCT_WORKFLOW.md.
First check git status, git log -5 --oneline, current branch and remote status.
Preserve existing work and leave untracked .agents/ untouched. Never print or
request secrets in chat. Use apply_patch for edits. Keep communication simple
and concise; use targeted checks while building and full relevant checks at
the final checkpoint. Do not create subagents unless I ask.

Current implementation:
- React operations dashboard, FastAPI and Next.js storefront with English/BM.
- Approved yellow hero, cream sections, strawberry-red controls and subtle
  motion. Preserve this visual direction across new pages.
- Real backend catalogue, backend-authoritative prices/promotions/availability,
  published bilingual content, Owner galleries (six photos), cover ordering
  and one featured homepage product. Changes appear on reload.
- Same-origin storefront media proxy, private-preview label and neutral hero
  fallback. Generated branding remains pending client approval.
- Product editor reset, catalogue pagination, discount display and stale-data
  bugs were fixed. Migration 0027 and persistent media volume are required.
- Tests use disposable databases and fictional data; never run destructive
  test fixtures against the working database.

Next task: refine the homepage slightly and add a matching cart and private
checkout/payment-page preview. Start by inspecting existing order, inventory,
quote and payment code so you reuse the architecture. Explain the small scope
you recommend, then implement it; ask only for decisions that materially block
progress. No complete visual redesign.

Implement in reviewable stages:
1. Add accessible Add to cart controls on real product cards/details and a
   header cart count. Add a responsive cart page with quantity edits, removal,
   empty/error states and links back to products. Persist only product IDs and
   quantities locally; handle invalid/stale storage safely. Re-fetch products
   and show changed prices, unavailable/unpublished items and quantity limits.
   Never trust browser totals or stock. Preserve RM, English/BM, keyboard access
   and reduced-motion preferences.
2. Build a private checkout/payment preview matching the design. Reuse existing
   backend quote/order boundaries where appropriate; do not expose admin
   endpoints or credentials to public browsers. Audit server validation,
   overselling/races, duplicate submissions and idempotency before adding any
   customer order endpoint. Keep the preview disabled by default and restricted
   to local/private review; it must not accidentally enable public checkout.
3. Use fictional inputs only. Do not collect real customer data, invent delivery
   charges/policies or simulate a successful real payment. If the provider is
   undecided, show an explicit unavailable/test-only payment state. Inspect the
   existing Stripe work; ask me to choose a sandbox provider before integrating
   one. Never build a form that collects raw card details. Payment confirmation
   must come from verified, idempotent provider webhooks, not browser redirects.
   Verify current official provider documentation when integrating it.

Client approval is still needed before public checkout/live payments: approved
products/photos/prices, fulfilment rules and charges, business details, bilingual
policies and a client-owned payment account. Do not turn these missing decisions
into invented copy. Keep WhatsApp DRAFT_ONLY; Meta verification is deferred.

Test cart persistence, quantity validation, stale price/stock, unpublished items,
API errors, duplicate actions, English/BM and mobile/desktop keyboard flows.
For any new backend checkout logic, add meaningful authorization, tampering,
concurrency and idempotency regressions using isolated databases. Run relevant
tests/lint/build, existing integration checks and git diff --check. Provide
previews and clearly report unfinished work. No deployment, commit or push
unless I explicitly ask in this new session.

---

## Before live checkout

Umar/client decisions: payment provider and sandbox account, pickup versus
delivery and approved fees/coverage, approved product content and photography,
business/contact details and reviewed English/BM policies. Enter credentials
only in local/provider secret settings, never in chat or Git.
