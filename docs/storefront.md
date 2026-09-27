# Storefront workflow and design record

The Next.js storefront uses the real FastAPI catalogue. Keep previews private
and use fictional content until the quality gate is approved.

## Product workflow

Owners manage one product record in the full-page workspace at `/products/new`
and `/products/:id`. The Details tab is the single source for the operational
and English storefront name and description. The Storefront tab holds only the
approved Bahasa Melayu translation, publication readiness, and homepage feature
selection. The Photos tab uploads up to six validated JPEG/PNG/WebP photos; the
first ordered image is the explicitly visible cover. Staff can inspect all tabs
but cannot mutate them. Inventory and Promotions remain specialist pages with
direct links from each product.

`Active for operations` and `Published online` are separate states. Publishing
requires an active product, an approved Bahasa Melayu name, and a working photo.
Deactivation unpublishes and clears the homepage feature. A published product
cannot lose its final photo. Storefront content, galleries, availability,
prices, and promotions remain backend-authoritative and update after reload.

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

## Homepage workflow

Owners manage the fixed landing-page content at `/storefront/homepage` in the
dashboard. English and Bahasa Melayu are edited together, but **Save draft** is
private and **Publish** is a separate audited action. A version check prevents
one browser session from silently overwriting another. The public storefront
reads only the published snapshot.

The section order and destinations are intentionally fixed: USP hero, optional
benefits, backend-authoritative featured collection, brand story, optional
Google reviews, optional location/map, and a closing catalogue CTA. Hero and
closing actions open `/products`; the story opens `/about`. Benefits start
disabled so no business claim is invented.

Google content is additionally controlled by the server-only
`STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED` gate. A saved Place ID or database
toggle cannot bypass it. Reviews and location remain hidden until the listing,
address, disclosures, quotas, and separately restricted Places and Embed keys
are approved.

The Places key is server-only and must be restricted to the Places API and the
expected server source. The separate Maps Embed key is browser-visible by
design and must be restricted to the Maps Embed API and approved web referrers.
Keep both outside Git. The storefront requests only the Place Details fields it
renders, never persists Google content, returns it with `Cache-Control:
no-store`, and displays at most three of the reviews Google returns. Review
author/source/report links, Google attribution, sorting notice, accessible
rating text, and translation disclosure stay visible. The map is loaded only
after a visitor chooses **Load map**.

Before enabling the server gate, verify all of the following: the client has
approved the exact listing and address; the Place ID belongs to that listing;
the public privacy policy and terms include the required Google disclosures;
both keys have appropriate API/application restrictions and quotas; and the
dashboard Google readiness check succeeds. Publishing an enabled Google section
also verifies the listing without saving the returned content. See Google's
[Place Details documentation](https://developers.google.com/maps/documentation/places/web-service/place-details),
[Places policies](https://developers.google.com/maps/documentation/places/web-service/policies),
[Maps Embed documentation](https://developers.google.com/maps/documentation/embed/embedding-map),
and [API key security guidance](https://developers.google.com/maps/api-security-best-practices).

## Design and asset provenance

The approved direction is yellow/cream with strawberry-red controls, dynamic
Owner-selected product imagery, restrained motion, and English/BM support.
Touch and reduced-motion users receive a stable composition.

The generated `public/concept/bahulu-bag.webp` is explicitly approved as the
private homepage fallback when no featured product photo is available, while
still awaiting final public-asset approval. `public/concept/brand-preview.webp`
remains private concept artwork, not approved packaging photography or a master
logo. Umar supplied the source references on 24 September 2026. Public image
ownership/licensing and final brand approval remain pending. Product cards do
not silently substitute concept imagery for missing product photos.

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
