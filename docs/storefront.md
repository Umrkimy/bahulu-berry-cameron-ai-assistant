# Storefront workflow and design record

The Next.js storefront uses the real FastAPI catalogue. Keep previews private
and use fictional content until the quality gate is approved.

## Product workflow

Owners create one product record, upload up to six validated JPEG/PNG/WebP
photos, manage approved bilingual content, publish it, and optionally feature
it on the homepage. The first ordered image is the cover. Storefront names,
descriptions, galleries, availability, prices, and promotions remain
backend-authoritative and update after reload.

Product images are served through restricted API and same-origin proxy routes.
Metadata lives in PostgreSQL and new files in `/app/media/products` on the
`product_media` volume. Uploads are decoded, orientation-corrected, stripped of
metadata, bounded to 1800 x 1800 pixels, and stored as WebP. SVG, animation,
corrupt, oversized, or over-limit uploads are rejected.

Back up database and media together. Restore them together into an isolated
environment and verify authenticated and published image routes. Downgrading a
migration is not a substitute for restoring matching data/media backups.

## Cart and checkout review

- The cart stores only product IDs and quantities under the versioned browser
  key. It re-quotes published products through the read-only API; browser totals
  never create orders or determine payment/stock state.
- Checkout collects no personal information and has no submission action.
- `/checkout` returns not found unless the server-only
  `STOREFRONT_CHECKOUT_PREVIEW_ENABLED=true` flag is set. Checked-in examples
  default to false.
- Existing Stripe routes remain authenticated admin operations. Public checkout
  requires a separately approved provider, fulfilment rules, policies, business
  details, customer intake, idempotency, and signed webhook design.

## Design and asset provenance

The approved direction is yellow/cream with strawberry-red controls, dynamic
Owner-selected product imagery, restrained motion, and English/BM support.
Touch and reduced-motion users receive a stable composition.

The generated `public/concept/bahulu-bag.webp` and
`public/concept/brand-preview.webp` are private reference assets, not approved
packaging photography or a master logo. Umar supplied the source references on
24 September 2026. Public image ownership/licensing and final brand approval
remain pending. Do not silently substitute concept imagery for missing product
photos.

## Verification

```powershell
# frontend
npm test -- --pool=threads --maxWorkers=1
npm run test:e2e -- --workers=1
npx playwright test --config playwright.integration.config.ts --reporter=line

# storefront
npm test
npm run lint -- --max-warnings=0
npm run build
```

The integration runner uses disposable data/media and loopback-only servers.
Never point it at the working database. Local screenshots and Playwright output
are disposable ignored artifacts, not approval evidence.
