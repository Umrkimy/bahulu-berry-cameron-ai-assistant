import { expect, test } from "@playwright/test";
import path from "node:path";

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

  await page.getByRole("tab", { name: "Storefront" }).click();
  await page
    .getByLabel("Product name — Bahasa Melayu")
    .fill("Demo pelanggan fiksyen");
  await page
    .getByLabel("Description — Bahasa Melayu")
    .fill("Penerangan demo fiksyen.");
  await page.getByRole("switch", { name: /Published online/ }).check();
  await page.getByRole("button", { name: "Save storefront" }).click();
  const featured = page.waitForResponse(
    (response) =>
      response.url().endsWith("/feature") &&
      response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Feature on homepage" }).click();
  expect((await featured).status()).toBe(200);
  await page.screenshot({
    path: "../output/playwright/product-workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../output/playwright/product-workspace-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const published = await (
    await page.request.get("http://127.0.0.1:8100/api/storefront/featured")
  ).json();
  expect(published.name_en).toBe("Fictional client walkthrough");
  expect(
    (
      await page.request.get(`http://127.0.0.1:8100${published.image_path}`)
    ).status(),
  ).toBe(200);

  const shop = await context.newPage();
  await shop.goto("http://127.0.0.1:3100/");
  const publicImage = published.image_path.match(
    /products\/(\d+)\/images\/(\d+)/,
  );
  expect(publicImage).not.toBeNull();
  expect(
    (
      await shop.request.get(
        `http://127.0.0.1:3100/product-media/${publicImage![1]}/${publicImage![2]}`,
      )
    ).status(),
  ).toBe(200);
  const hero = shop.locator(".hero-product-image");
  await expect(hero).toHaveAttribute("alt", "Fictional client walkthrough");
  await expect
    .poll(() =>
      hero.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await hero.click();
  await expect(
    shop.getByRole("heading", {
      name: "Fictional client walkthrough",
      exact: true,
    }),
  ).toBeVisible();
  await expect(shop.locator(".shop-detail-price strong")).toContainText(
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
    expect(
      await shop.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
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
  await expect(shop.getByRole("link", { name: "Cart: 1" })).toBeVisible();
  await shop.getByRole("link", { name: "Cart: 1" }).click();
  await expect(shop.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(shop.locator(".cart-total dd")).toHaveText("RM 18.00");
  const increase = shop.getByRole("button", {
    name: "Increase quantity: Fictional client walkthrough",
  });
  await increase.focus();
  await shop.keyboard.press("Enter");
  await expect(shop.getByRole("link", { name: "Cart: 2" })).toBeVisible();
  await expect(shop.locator(".cart-total dd")).toHaveText("RM 36.00");
  await shop.reload();
  await expect(shop.getByRole("link", { name: "Cart: 2" })).toBeVisible();
  await shop.getByRole("link", { name: "Private checkout preview" }).click();
  await expect(
    shop.getByRole("heading", { name: "Checkout preview" }),
  ).toBeVisible();
  await expect(
    shop.getByText(
      "No sandbox provider has been selected. Payment is unavailable and test-only.",
    ),
  ).toBeVisible();
  await expect(shop.locator("input")).toHaveCount(0);
  await expect(
    shop.getByRole("button", { name: /ordering and payment are disabled/ }),
  ).toBeDisabled();

  await page.getByRole("tab", { name: "Storefront" }).click();
  await page.getByRole("switch", { name: /Published online/ }).uncheck();
  await page.getByRole("button", { name: "Save storefront" }).click();
  await shop.goto("http://127.0.0.1:3100/cart");
  await expect(
    shop.getByText("This product is no longer available."),
  ).toBeVisible();
  await expect(
    shop.getByRole("link", { name: "Private checkout preview" }),
  ).toHaveCount(0);
  await shop.goto(`http://127.0.0.1:3100/products/${published.id}`);
  await expect(shop.locator(".shop-state")).toBeVisible();
  await shop.goto("http://127.0.0.1:3100/");
  await expect(shop.locator(".hero-image-fallback:visible")).toHaveCount(1);
});
