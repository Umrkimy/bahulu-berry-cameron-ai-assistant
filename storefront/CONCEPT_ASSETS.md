# Private storefront concept

**Current implementation:** product cards, detail galleries and the homepage
hero now use Owner-managed backend photos. The generated bag below is retained
only as a historical concept/test reference; it is no longer a runtime fallback.
The generated logo remains in the design pending approval. See
[Product workflow](PRODUCT_WORKFLOW.md) for setup, real-backend verification and
database/media backup instructions. Evidence below records earlier design work.

This local design is not a production release. Do not deploy or publish the
artwork, copy or brand treatment until the client has approved it and image
rights are recorded. Homepage and product-route metadata is noindex/nofollow; this is not access
control. Any shared preview must remain behind the existing Cloudflare Access.

## Assets and provenance

Umar supplied three visual references in this conversation on 24 September
2026. The second photo (bagged bahulu) is the main product reference. The third
is the logo reference. Reference use for this private concept is authorised;
ownership/licensing for public use remains awaiting client approval.

| Local asset | Treatment | Status |
| --- | --- | --- |
| `public/concept/bahulu-bag.webp` | Generated reference-based product mockup, 900 × 1350, transparent WebP, approximately 237 KB | Private review only; not accurate/approved packaging photography |
| `public/concept/brand-preview.webp` | Generated extraction/reconstruction of the supplied mascot and primary wordmark, 400 × 400, transparent WebP, approximately 48 KB | Private review only; replace with client-approved master logo |

Generated with the built-in image-generation tool, then resized/encoded with
Sharp while retaining alpha. Original outputs remain in the local Codex
generated-images directory. No external image hosts or embeds are used.

### Product prompt

Generate one photorealistic product cutout for a private concept bakery
website. Image 1: general context. Image 2: primary clear flexible cellophane
bag and flower-moulded bahulu reference. Image 3: smiling red strawberry in
yellow explorer hat with green leaves and BAHULU BERRY CAMERON wordmark.
One upright, elongated sealed clear bag with golden-brown bahulu, realistic
wrinkles, warm studio lighting, slight eight-degree tilt, full product visible
and generous transparent margin. Not a jar, box or zip pouch. Large reference-
based mascot label; only the main brand words. Genuine transparent alpha,
no ground plane, backdrop or props. No watermark, promotional captions,
phone number, flavour label, tiny slogan or health claims. Concept packaging,
not approved product photography.

### Logo prompt

Extract only the central mascot and main BAHULU BERRY CAMERON wordmark from
the user's square yellow logo reference. Preserve identity, hat, leaves,
face, colours, lettering and outlines as closely as possible. Remove the
background and repeated edge logos. Omit the tiny slogan and its plaque.
No new text or objects. Centred square transparent cutout with five percent
padding. Do not use the generated bag as the source. Reference-derived preview,
not an approved master brand file.

## Runtime and review boundaries

- Existing published products supply the collection; the homepage adds no
  product records, prices, availability promises or messaging links.
- The hero renders independently of the catalogue. Loading/error/empty states
  are local to the collection; an eight-second fetch timeout prevents indefinite
  waiting. Retry refreshes the server-rendered collection.
- Short entry animation and maximum six-degree pointer tilt only; touch and
  reduced-motion users get a static image. JavaScript is not required to see it.
- English/BM uses the existing locale provider; document language follows the
  selection. Storage denial must not prevent switching within the page.
- Public claims/policies, checkout, Meta intake, WhatsApp sends and deployment
  are outside this change. Existing non-home page copy still needs its own
  client review before public launch.

## Quality-gate evidence

- Content/image approval: **awaiting client approval**, private mockups labelled.
- New public intake, trackers, cookies, embeds: **not applicable**; none added.
- Backend schema/provider integrations: **not applicable**; no changes.
- Accessibility and browser scenarios: **verified** in local Chromium with
  fictional fixtures. 37 checks passed: success/empty/error/timeout/retry,
  six-product limit, navigation and keyboard skip link, English/BM and language
  persistence, denied storage access/writes, no-JavaScript hero, failed hero
  image, touch/reduced-motion behavior, and pointer tilt bounded to six degrees.
  No horizontal overflow at 320, 390, 768, 1024 or 1440 pixels. Sampled text/button
  contrast ranges from 4.75:1 to 14.25:1. This is targeted verification, not a
  full accessibility certification.
- Tests/lint/build: **verified** — seven native storefront tests,
  `npm run lint -- --max-warnings=0`, `npm run build`, and `git diff --check`.
- Deployment/production restore checks: **not applicable** to this local preview.

### Review artifacts and local preview

Screenshots are local-only under ignored `output/playwright/`:
`home-desktop.png`, `home-mobile.png`, `home-mobile-bm.png`, and
`home-tablet-bm.png`. Only Next's developer overlay was hidden for screenshots.
The screenshots deliberately show the empty catalogue, not invented products.

The local preview is `http://127.0.0.1:3100`; its API is an isolated in-memory
fictional fixture on `127.0.0.1:3101`, currently in empty mode. It does not use or
modify the working database. Local verification helpers are in the same ignored
artifact directory. Ordinary development continues to use the configured API.

The preceding bug fixes were pushed separately as `c37a55a`; all checks in
[GitHub run 36021119149](https://github.com/Umrkimy/bahulu-berry-cameron-ai-assistant/actions/runs/36021119149)
passed. Storefront design changes are uncommitted and have not been deployed. An additional
built-preview server launch was blocked by automatic approval review; browser
checks used the existing development preview and the production build passed.

## Catalogue and product detail extension

The catalogue and product detail now share the yellow, cream and strawberry-red
homepage treatment. Existing API data remains authoritative for names,
descriptions, images, availability, prices and promotions. Generated bag artwork
is not automatically substituted for actual product photography. Missing or
failed images show a neutral placeholder.

Catalogue search accepts English and Malay names, with category filters and
sorting by name or current price. Product details retain the existing configured
enquiry link only when a contact is configured; no messaging integration was
added. Loading, failure, retry and missing-product screens share the styling.

Verification: 12 native storefront tests, lint with zero warnings, production
build and diff whitespace checks passed. An additional 32 browser checks cover
catalogue filtering/sorting, zero sale prices, API recovery, missing content,
404s, bilingual rendering and widths from 320 to 1440 pixels. Nine final checks
cover image network failure, keyboard focus, homepage layout/language regression
and reduced-motion behavior. This is targeted Chromium verification.

Additional local screenshots: `catalogue-desktop.png`, `catalogue-mobile.png`,
`product-detail-desktop.png`, `product-detail-mobile.png` and
`product-detail-mobile-bm.png` under `output/playwright/`. These screenshots use
explicitly fictional fixture names, prices and promotions. Browser-only image
interception displays the generated bag for layout review; this does not modify
the application catalogue or database. The imagery and commercial values shown
are not approved business content.
