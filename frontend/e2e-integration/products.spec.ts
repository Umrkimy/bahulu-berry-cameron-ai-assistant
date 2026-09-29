import { expect, test } from "@playwright/test";
import path from "node:path";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    { message: "The responsive layout should settle without horizontal overflow", timeout: 3_000 },
  ).toBe(true);
  const result = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${Array.from(element.classList).slice(0, 2).map((name) => `.${name}`).join("")}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1)
      .slice(0, 12),
  }));
  expect(result.documentWidth, JSON.stringify(result, null, 2)).toBeLessThanOrEqual(result.viewportWidth);
}

test("Owner product workspace reaches the real storefront", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("owner@example.com");
  await page
    .getByRole("textbox", { name: "Password" })
    .fill("Fictional-E2E-Only-123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"));

  await page.goto("/storefront/homepage");
  await expect(page.getByRole("heading", { name: "Storefront homepage" })).toBeVisible();
  const staleEditor = await context.newPage();
  await staleEditor.goto("/storefront/homepage");
  await expect(staleEditor.getByRole("heading", { name: "Storefront homepage" })).toBeVisible();
  const publishedBeforeDraft = await (
    await page.request.get("http://127.0.0.1:8100/api/storefront/homepage")
  ).json();
  const fictionalHomepageCopy = "Fictional private acceptance copy. Not approved business content.";
  await page.getByLabel("Introduction — English").fill(fictionalHomepageCopy);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Homepage draft saved")).toBeVisible();
  await staleEditor.getByRole("textbox", { name: /Introduction/ }).fill("This edit intentionally uses a stale draft version.");
  await staleEditor.getByRole("button", { name: "Save draft" }).click();
  await expect(staleEditor.getByText("Draft could not be saved")).toBeVisible();
  await expect(staleEditor.getByText("This homepage draft changed in another session. Reload it before saving again.")).toBeVisible();
  await staleEditor.close();
  const stillPublished = await (
    await page.request.get("http://127.0.0.1:8100/api/storefront/homepage")
  ).json();
  expect(stillPublished.hero.body.en).toBe(publishedBeforeDraft.hero.body.en);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Homepage published")).toBeVisible();
  const publishedHomepage = await (
    await page.request.get("http://127.0.0.1:8100/api/storefront/homepage")
  ).json();
  expect(publishedHomepage.hero.body.en).toBe(fictionalHomepageCopy);
  expect(publishedHomepage.hero.body.ms.trim()).not.toBe("");
  await expect(page.getByRole("switch", { name: "Not ready" })).toHaveCount(2);

  await page.goto("/products");
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/new$/);
  await page
    .getByLabel("Product name — English")
    .fill("Fictional client walkthrough");
  await page
    .getByLabel("Description — English")
    .fill("Fictional test product. Not approved business content.");
  await page.getByLabel("Base price").fill("12.00");
  await page.getByLabel("Opening stock").fill("3");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/products\/\d+\/photos$/);
  const primaryProductPhotosUrl = page.url();
  await expect(page.getByText("Product created")).toBeVisible();

  const choose = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload photos" }).click();
  await (
    await choose
  ).setFiles([
    path.resolve("../storefront/public/concept/bahulu-bag.webp"),
    path.resolve("../storefront/public/concept/brand-preview.webp"),
  ]);
  await expect(page.getByAltText("Cover photo for this product")).toBeVisible();
  await expect(
    page.getByAltText("Gallery 2 photo for this product"),
  ).toBeVisible();
  await expect(page.getByText("Photos updated")).toBeVisible();

  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media Library" })).toBeVisible();
  await expect(page.getByText("bahulu bag")).toBeVisible();
  await expect(page.getByText("brand preview")).toBeVisible();
  await page.goto("/products");
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  await page.getByLabel(/Product name.*English/).fill("Fictional shared-media product");
  await page.getByLabel("Base price").fill("9.00");
  await page.getByLabel("Opening stock").fill("0");
  await page.getByRole("button", { name: "Create product" }).click();
  await page.getByRole("button", { name: "Choose from library" }).click();
  await page.getByRole("button", { name: "Choose bahulu bag" }).click();
  await expect(page.getByText("Photos updated")).toBeVisible();
  await page.goto("/media");
  await expect(page.getByText("Used by 2 products")).toBeVisible();
  await page.goto(primaryProductPhotosUrl);
  await expect(page.getByAltText("Cover photo for this product")).toBeVisible();

  await page.getByRole("tab", { name: "Storefront" }).click();
  await page
    .getByLabel("Product name — Bahasa Melayu")
    .fill("Demo pelanggan fiksyen");
  await page
    .getByLabel("Description — Bahasa Melayu")
    .fill("Penerangan demo fiksyen.");
  await page.getByRole("switch", { name: /Published online/ }).check();
  await page.getByRole("button", { name: "Save storefront" }).click();
  await expect(page.getByText("Storefront settings saved")).toBeVisible();
  // The homepage hero is fixed brand artwork, so products are never featured.
  await expect(page.getByRole("button", { name: /Feature/ })).toHaveCount(0);
  await page.screenshot({
    path: "../output/playwright/product-workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: "../output/playwright/product-workspace-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const catalogue = await (
    await page.request.get("http://127.0.0.1:8100/api/storefront/products")
  ).json();
  const published = catalogue.items.find(
    (item: { name_en: string }) => item.name_en === "Fictional client walkthrough",
  );
  expect(published).toBeTruthy();
  expect(
    (
      await page.request.get(`http://127.0.0.1:8100${published.image_path}`)
    ).status(),
  ).toBe(200);

  const shop = await context.newPage();
  await shop.goto("http://127.0.0.1:4100/");
  await expect(shop.getByText(fictionalHomepageCopy)).toBeVisible();
  const publicImage = published.image_path.match(
    /products\/(\d+)\/images\/(\d+)/,
  );
  expect(publicImage).not.toBeNull();
  expect(
    (
      await shop.request.get(
        `http://127.0.0.1:4100/product-media/${publicImage![1]}/${publicImage![2]}`,
      )
    ).status(),
  ).toBe(200);
  const hero = shop.locator(".hero-product-image");
  await expect(hero).toHaveAttribute("src", /bahulu-bag\.webp/);
  await expect
    .poll(() =>
      hero.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await shop.emulateMedia({ reducedMotion: "reduce" });
  await shop.reload();
  await expect(shop.locator(".product-float:visible").first()).toHaveCSS("transform", "none");
  await shop.emulateMedia({ reducedMotion: "no-preference" });
  await shop.reload();
  await shop.goto(`http://127.0.0.1:4100/products/${published.id}`);
  await expect(
    shop.getByRole("heading", {
      name: "Fictional client walkthrough",
      exact: true,
    }),
  ).toBeVisible();
  await expect(shop.locator(".shop-detail-price strong").first()).toContainText(
    "12.00",
  );
  await shop.getByRole("button", { name: "View photo 2" }).focus();
  await shop.keyboard.press("Enter");
  await expect(
    shop.getByRole("button", { name: "View photo 2" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Details" }).click();
  await page.getByLabel("Base price").fill("18.00");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Product details saved")).toBeVisible();
  await shop.reload();
  await expect(shop.locator(".shop-detail-price strong").first()).toContainText(
    "18.00",
  );
  await shop.getByRole("button", { name: "Choose language: English" }).click();
  await shop.getByRole("menuitemradio", { name: "Bahasa Melayu" }).click();
  await expect(
    shop.getByRole("heading", { name: "Demo pelanggan fiksyen", exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await shop.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(shop);
  }
  await shop.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await shop.screenshot({
    path: "../output/playwright/backend-detail-desktop.png",
    fullPage: true,
  });
  await shop.setViewportSize({ width: 390, height: 844 });
  await shop.screenshot({
    path: "../output/playwright/backend-detail-mobile.png",
    fullPage: true,
  });

  await page.getByRole("tab", { name: "Photos" }).click();
  const reordered = page.waitForResponse(
    (response) =>
      response.url().endsWith("/images") &&
      response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Move photo 2 earlier" }).focus();
  await page.keyboard.press("Enter");
  expect((await reordered).status()).toBe(200);
  await expect(page.getByText("Photos updated")).toBeVisible();
  await shop.reload();
  await expect(shop.locator(".shop-detail-image img:visible")).toHaveCount(1);
  await expect(shop.locator(".shop-detail-image img:visible")).toHaveAttribute(
    "src",
    new RegExp(`/product-media/${published.id}/${published.images[1].id}$`),
  );
  await shop.getByRole("button", { name: "Pilih bahasa: Bahasa Melayu" }).click();
  await shop.getByRole("menuitemradio", { name: "English" }).click();
  await shop
    .getByRole("button", { name: /Add to cart: Fictional client walkthrough/ })
    .click();
  await expect(shop.getByText("Fictional client walkthrough: Added to cart.")).toBeAttached();
  await expect(shop.getByRole("link", { name: "Cart: 1" })).toBeVisible();
  await shop.getByRole("link", { name: "Cart: 1" }).click();
  await expect(shop.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(shop.locator(".cart-total dd")).toHaveText("RM 18.00");
  const increase = shop.getByRole("button", {
    name: "Increase quantity: Fictional client walkthrough",
  });
  await increase.focus();
  await shop.keyboard.press("Enter");
  await expect(shop.getByText("Fictional client walkthrough: Quantity updated to 2.")).toBeAttached();
  await expect(shop.getByRole("link", { name: "Cart: 2" })).toBeVisible();
  await expect(shop.locator(".cart-total dd")).toHaveText("RM 36.00");
  await shop.reload();
  await expect(shop.getByRole("link", { name: "Cart: 2" })).toBeVisible();
  await shop.getByRole("link", { name: "Pay online" }).click();
  await expect(shop.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(shop.getByText("Test mode")).toBeVisible();
  await shop.getByRole("button", { name: "Continue to payment" }).click();
  await expect(shop.locator(".checkout-form [role=alert][tabindex='-1']")).toBeFocused();
  await expect(shop.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
  await shop.getByLabel("Full name").fill("Fictional Walkthrough Buyer");
  await shop.getByLabel("Phone number").fill("012-000 0001");
  await shop.getByLabel("Street address").fill("1 Jalan Rekaan");
  await shop.getByLabel("Town or city").fill("Tanah Rata");
  await shop.getByLabel("Postcode").fill("39000");
  await shop.getByLabel("State").selectOption("Pahang");
  await shop.getByLabel(/may use these details/).check();
  // The fictional provider's hosted page is intercepted and sent back to the
  // storefront's return page, as Stripe would after payment.
  await shop.route("https://payments.example.com/**", (route) =>
    route.fulfill({ status: 302, headers: { location: "http://127.0.0.1:4100/checkout/success" } }),
  );
  const placed = shop.waitForResponse((response) => response.url().endsWith("/storefront-data/checkout"));
  await shop.getByRole("button", { name: "Continue to payment" }).click();
  expect((await placed).status()).toBe(201);
  await expect(shop.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(shop.locator(".checkout-order-number strong")).toHaveText(/^#\d+$/);
  await expect(shop.getByRole("link", { name: "Cart: 0" })).toBeVisible();
  await shop.goto(`http://127.0.0.1:4100/products/${published.id}`);
  await shop
    .getByRole("button", { name: /Add to cart: Fictional client walkthrough/ })
    .click();
  await expect(shop.getByRole("link", { name: "Cart: 1" })).toBeVisible();

  await page.getByRole("tab", { name: "Storefront" }).click();
  await page.getByRole("switch", { name: /Published online/ }).uncheck();
  await page.getByRole("button", { name: "Save storefront" }).click();
  await shop.goto("http://127.0.0.1:4100/cart");
  await expect(
    shop.getByText("This product is no longer available."),
  ).toBeVisible();
  await expect(
    shop.getByRole("link", { name: "Pay online" }),
  ).toHaveCount(0);
  await shop.goto(`http://127.0.0.1:4100/products/${published.id}`);
  await expect(shop.locator(".shop-state")).toBeVisible();
  await shop.goto("http://127.0.0.1:4100/");
  await expect(shop.locator(".hero-fallback-image:visible")).toHaveCount(1);

  await page.getByRole("tab", { name: "Details" }).click();
  await page.getByRole("switch", { name: /Active for operations/ }).uncheck();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("The product is inactive and has been unpublished.")).toBeVisible();
});
