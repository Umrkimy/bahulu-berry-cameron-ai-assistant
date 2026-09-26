# Dashboard to storefront workflow

This design uses the real FastAPI catalogue. Mock API helpers under ignored
`output/playwright/` are historical test artifacts and are not used by the app.
Keep shared previews private and use fictional records until content is approved.

## Local setup

From the repository root, with Docker Desktop running:

```powershell
docker compose up -d --build
```

The migration service applies `0027_product_gallery` before API startup. Open
the dashboard at `http://localhost:5173` and storefront at `http://localhost:3000`.
Use the existing local Owner account; do not put credentials in this document.
For an existing database, take a backup before applying the migration.

For separate development processes, use the usual backend/dashboard commands
and run `npm run dev` in `storefront`. Its default API is localhost:8000/api.
`STOREFRONT_SERVER_API_BASE_URL` can point to the API from the Next server;
Docker sets it to `http://api:8000/api`. Product images use the same server-side
connection through a restricted same-origin media route. No browser needs to
resolve the Docker hostname. Do not point development at the old mock port 3101.

## Owner walkthrough

1. Create a fictional product with a price and opening stock. Internal name
   and description belong to operations; the product starts unpublished.
2. Edit it. Upload up to six JPEG, PNG or WebP photos (5 MB and 20 megapixels
   each). Photos save independently of the product form. Use Earlier/Later
   buttons to reorder them; the first is the cover. Replace and Remove act on
   the selected photo. Removed/replaced photos are no longer served by the API.
3. Enter approved English and Bahasa Melayu storefront names and optional
   descriptions. Save with Publish on storefront enabled.
4. Reopen the saved product and select Feature on homepage. This replaces the
   previous selection. It requires an active, published product and a working
   cover image. An out-of-stock published product can remain visible but is
   explicitly labelled unavailable.
5. Reload the storefront. Verify the cover on the homepage/cards, gallery on
   product details, and both languages. Change a price or description in the
   dashboard, save, then reload: the saved backend value appears immediately.
6. Change stock through Inventory or offers through Promotions. Reload and
   check availability/pricing. Unpublish or deactivate the product: its public
   details and media disappear. If it was featured, the hero shows the neutral
   brand fallback. No other product or generated bag is silently substituted.

No public checkout, live payment, polling, automated replies or outbound messaging was added.
The generated logo remains a private design reference pending approval.

## Cart and checkout preview

- The cart stores only product IDs and quantities in browser local storage. It
  rechecks published products, availability, promotions and totals through the
  read-only backend storefront quote endpoint; browser totals are never used as
  an order or payment authority.
- Checkout is a non-submitting private preview. It does not collect customer
  details or create customers, orders, deliveries, payments or stock movements.
- `/checkout` returns not found unless the server-only
  `STOREFRONT_CHECKOUT_PREVIEW_ENABLED=true` setting is present. The default in
  every checked-in environment example is `false`.
- The existing Stripe routes remain authenticated admin operations. Selecting
  and integrating a customer sandbox provider is separate client-approved work.

## Media storage and recovery

- Metadata/order is stored in PostgreSQL; new images live in
  `/app/media/products`, mounted from the `product_media` volume. The staging
  override uses a distinct `product_staging_media` volume.
- Native development uses `backend/media/products`, configurable through
  `PRODUCT_MEDIA_DIRECTORY`. It is ignored by Git and excluded from Docker builds.
- Uploads are decoded, orientation-corrected, stripped of metadata, resized
  within 1800 × 1800 pixels and encoded as WebP. Transparent backgrounds remain
  transparent. SVG, animation, corrupt images and over-limit files are rejected.
- Existing `image_file` records migrate into the ordered gallery as legacy
  entries. Their original bundled files remain intact. The `image_path` API
  field remains available, alongside the new `images` array and admin `sale_price`.
  Product files are no longer served through the old unchecked static URL;
  gallery reads enforce publication or admin authentication. Only the generic
  default placeholder remains public at its old static path. Filename writes
  through `image_file` are replaced by the validated gallery upload endpoints.
- Back up the database **and** media together: pause API writes, run the existing
  PostgreSQL backup procedure, copy `/app/media/products` from the stopped API
  container into the same private backup set using `docker compose cp`, then
  restart the API. Retain the application image containing legacy assets.
- Restore into an isolated environment first: restore the matching database,
  copy media into the mounted directory, ensure UID 10001 can read/write it,
  then check authenticated and published image URLs before resuming service.
  Never use `docker compose down -v` for an ordinary restart.
- Replaced/deleted media bytes are retained for backup recovery, but cannot be
  fetched through the image API. Monitor disk usage. No automatic file garbage
  collection is included; purge only against a verified DB/media backup inventory.
- Database downgrade removes gallery metadata. Restore the matching backup to
  recover galleries; downgrade alone is not a data recovery procedure.

## Verification commands

```powershell
# frontend directory: existing regression suite and browser suite
npm test -- --pool=threads --maxWorkers=1
npm run test:e2e -- --workers=1

# frontend directory: real API + temporary DB/media + both UIs
npx playwright test --config playwright.integration.config.ts --reporter=line

# storefront directory
npm test
npm run lint -- --max-warnings=0
npm run build
```

The integration runner binds only loopback ports 8100, 4174 and 3100. It creates
a fresh temporary SQLite database and media directory, overrides service keys
with unused test-only values, and uses normal authentication and CSRF protection.
It never truncates or seeds the working database. Screenshots contain fictional
products and uploaded generated references, not approved business photography.

Backend tests use an isolated database. If setting `TEST_DATABASE_URL`, use only
a disposable database: the existing pytest fixture drops application tables.
PostgreSQL 16 + pgvector migration and concurrency checks must also run before
release. This iteration does not publish, deploy, commit or push the changes.

## Recorded verification

- Full backend suite on isolated PostgreSQL 16 + pgvector: 124 passed during
  implementation. Subsequent targeted gallery checks also passed, including
  concurrent upload limits, atomic homepage selection and legacy static access.
- Dashboard regression: 48 passed with one thread worker, plus the new edit-form
  regression passed after fixing the form-reset loop. The first fork-worker run
  timed out during worker startup; the thread-worker rerun passed.
- Storefront native tests: 16 passed. Existing desktop/mobile browser suite:
  12 passed. Real-backend product/gallery browser walkthrough: passed, including
  bilingual layouts at 320, 390, 768 and 1440 pixels and keyboard gallery selection.
- PostgreSQL migration upgrade/downgrade and legacy-image backfill passed.
  Backend Docker build passed; a non-root container wrote an image to the media
  volume and a newly created container read it successfully.
- Backend Bandit and workflow actionlint checks passed. Dashboard and storefront
  production builds, lint and the final `git diff --check` passed.
- New browser coverage is wired into the existing GitHub frontend job. These
  changes have not been pushed, so this is local evidence, not a new CI result.

Local screenshots: `output/playwright/backend-detail-desktop.png` and
`backend-detail-mobile.png`. They show fictional database records with uploaded
generated reference images, served through the actual backend and media route.
Existing dependency deprecation notices and the dashboard's large chart-bundle
warning remain; they did not fail the checks. No full accessibility certification
or public launch approval is implied.
