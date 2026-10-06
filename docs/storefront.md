# Storefront workflow and design record

The Next.js storefront uses the real FastAPI catalogue. Keep previews private
and use fictional content until the quality gate is approved.

## Product workflow

Owners manage one product record in the full-page workspace at `/products/new`
and `/products/:id`. The Details tab is the single source for the operational
and English storefront name and description. The Storefront tab holds only the
approved Bahasa Melayu translation, publication readiness, and homepage feature
selection. The Photos tab uploads or selects up to six approved photos from the
shared Media Library; the first ordered image is the explicitly visible cover.
Staff can inspect all tabs and `/media`, but only Owners can upload, attach,
archive, restore, edit, or delete media. Inventory and Promotions remain
specialist pages with direct links from each product.

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

One media asset may be reused by multiple product galleries without copying the
file. Internal media titles and notes are never returned by public storefront
APIs. Archiving prevents new selections but does not break an existing product;
permanent deletion is available only after an asset is archived and unused.
Storefront alt text continues to use the selected English or Bahasa Melayu
product name.

Back up database and media together. Restore them together into an isolated
environment and verify authenticated and published image routes. Downgrading a
migration is not a substitute for restoring matching data/media backups.

## Cart and checkout review

- The cart stores only product IDs and quantities under the versioned browser
  key. It re-quotes published products through the read-only API; browser totals
  never create orders or determine payment/stock state.
- Checkout collects no personal information and has no submission action.
- Until online payment is approved, the cart ends with **Send order on
  WhatsApp**: it opens WhatsApp with a draft of the quoted items and total that
  the customer reviews and sends. Nothing is sent automatically. It appears only
  when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set; without it the cart says online
  ordering isn't available yet. The payment provider is still undecided.
- Unconfirmed content (two homepage figures, some FAQ answers, and the Terms,
  Privacy, Shipping and Cancellation & Refund pages under `/policies/*`) is
  drafted in `app/_lib/content.ts`, `faq.ts` and `policies.ts`. It renders only
  when the server-only `STOREFRONT_DRAFT_CONTENT=true` flag is set, which
  checked-in examples keep false. The client must confirm the figures and
  approve the policies (ideally with legal review) before the flag is enabled
  anywhere public. The FAQ deliberately makes no halal or allergen claims.
- `/pickup-delivery` returns not found and is left out of navigation and the
  sitemap until pickup and delivery details are approved.
- `/checkout` returns not found unless the server-only
  `STOREFRONT_CHECKOUT_PREVIEW_ENABLED=true` flag is set. Checked-in examples
  default to false.
- With the page visible, the API's `STOREFRONT_CHECKOUT_ENABLED` decides the
  mode. Off (the default), `/checkout` is the review-only preview. On, it shows
  the order form: `POST /api/storefront/checkout` prices the order on the
  server, deducts stock, finds or creates the customer by phone (never
  overwriting an existing record; the order's delivery snapshot holds what was
  typed), and returns a hosted payment page. Each submission carries an
  `Idempotency-Key`, so a retry returns the same order.
- Checkout is **Stripe test mode only**. The API refuses to start with the
  flag on and a non-`sk_test_` key unless `PAYMENTS_LIVE_APPROVED=true`, which
  needs Umar's and the client's approval. HitPay or ToyyibPay can replace
  Stripe behind `app/payments/base.py` (`PAYMENT_PROVIDER`).
- Money is marked paid only by the signed webhook (`/api/payments/webhook`),
  which skips redelivered event ids. Expired or failed payments cancel the
  website order and restore stock; a sweep also cancels website orders left
  unpaid for `STOREFRONT_UNPAID_ORDER_MINUTES` (45). Admin orders are never
  auto-cancelled. `/checkout/success` and `/checkout/cancelled` are the Stripe
  return pages; the success page never treats the redirect as proof of payment.
- Local test run: set `STOREFRONT_CHECKOUT_ENABLED=true` with your Stripe test
  keys, run `stripe listen --forward-to localhost:8000/api/payments/webhook`,
  use its `whsec_...` as `STRIPE_WEBHOOK_SECRET`, and pay with card
  `4242 4242 4242 4242`.

## Order tracking and status emails

- Each website order can have several private tracking links
  (`/orders/<token>`): one on the checkout success page and one in each status
  email. Only SHA-256 hashes are stored (`order_tracking_tokens`), and every
  link stops working `TRACKING_RETENTION_DAYS` (90) after the order closes.
  Customers who lose their link use `/orders/find` with the order number and
  phone.
- With `CUSTOMER_STATUS_EMAILS_ENABLED=true`, website orders that gave an email
  at checkout get one email, in the checkout language, when the order is paid,
  shipped (with courier and tracking number), delivered, not delivered (each
  failure), or cancelled after payment. Unpaid orders that time out, being
  prepared, in transit and out for delivery send nothing. WhatsApp and
  admin-entered orders are never emailed.
- A status change queues an `email_deliveries` row in the same transaction; the
  API sends queued rows every minute and retries a failed send up to five
  times. A tracking link only works once its email has been sent.
- The wording (`backend/app/services/customer_status_emails.py`) is a draft
  for Umar's review, ideally with a native BM reader. It states facts only.
- Before switching it on anywhere real: Umar's and the client's approval; the
  bakery's domain verified in Resend with `EMAIL_FROM` set (until then Resend
  only delivers to the account owner); an `https://` `STOREFRONT_PUBLIC_URL`
  (staging and production refuse to start without one); the privacy policy
  approved; and the checkout email hint updated to mention order updates. Test
  locally with `EMAIL_PROVIDER=console`.

## Homepage workflow

Owners manage the fixed landing-page content at `/storefront/homepage` in the
dashboard. English and Bahasa Melayu are edited together, but **Save draft** is
private and **Publish** is a separate audited action. A version check prevents
one browser session from silently overwriting another. The public storefront
reads only the published snapshot.

Eyebrow fields remain in the saved content for compatibility, but the storefront
no longer shows them and publishing no longer requires them. The section order
and destinations are intentionally fixed: USP hero, optional
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
is the strawberry mascot, confirmed by Umar on 29 September 2026 as the final
brand character; it is not packaging photography or a master logo. Umar supplied the source references on 24 September 2026. Public image
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
