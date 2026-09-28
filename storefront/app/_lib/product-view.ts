import type { Locale, Promotion, StorefrontProduct } from "./types";

export type ProductSort = "name" | "price-low" | "price-high";

export function filterProducts(products: StorefrontProduct[], locale: Locale, query: string, category: string | null, sort: ProductSort): StorefrontProduct[] {
  const search = query.trim().toLocaleLowerCase();
  const collator = new Intl.Collator(locale === "ms" ? "ms-MY" : "en-MY");
  return products.filter(product =>
    (category === null || product.category === category) &&
    (!search || [product.name_en, product.name_ms].some(name => name.toLocaleLowerCase().includes(search))),
  ).sort((a, b) => {
    if (sort !== "name") {
      const difference = Number(a.sale_price ?? a.price) - Number(b.sale_price ?? b.price);
      if (difference !== 0) return sort === "price-low" ? difference : -difference;
    }
    return collator.compare(locale === "ms" ? a.name_ms : a.name_en, locale === "ms" ? b.name_ms : b.name_en) || a.id - b.id;
  });
}

export function promotionText(promotion: Promotion, locale: Locale): string {
  const value = Number(promotion.discount_value);
  const currency = new Intl.NumberFormat(locale === "ms" ? "ms-MY" : "en-MY", { style: "currency", currency: "MYR" }).format(value);
  if (promotion.discount_type === "PERCENTAGE") return locale === "ms" ? `Diskaun ${value}%` : `${value}% off`;
  if (promotion.discount_type === "FIXED_AMOUNT") return locale === "ms" ? `Diskaun ${currency}` : `${currency} off`;
  return locale === "ms" ? `Beli ${promotion.bundle_quantity} dengan ${currency}` : `Buy ${promotion.bundle_quantity} for ${currency}`;
}

export const productCopy = {
  en: {
    title: "Our", titleAccent: "bahulu.", intro: "Current products and prices.",
    search: "Search products", categories: "Product categories", all: "All products", sort: "Sort by", nameSort: "Name: A–Z", lowSort: "Price: low to high", highSort: "Price: high to low",
    clear: "Clear filters", noMatches: "No products match your search.", noMatchesBody: "Try another name or clear the filters.", empty: "No products to show yet.", emptyBody: "",
    view: "View product", photo: "No photo yet", unavailable: "Currently unavailable", available: "Available", details: "Description", price: "Price", regular: "Regular price", offers: "Current offers", back: "Back to products", breadcrumb: "Breadcrumb", home: "Home", products: "Products", imageLabel: "Product photograph",
    loading: "Loading…", loadingBody: "", error: "Something went wrong.", errorBody: "We couldn’t load this page. Please try again.", retry: "Try again", missing: "We couldn’t find that page.", missingBody: "It may have moved or is no longer available. See our current products instead.",
  },
  ms: {
    title: "Bahulu", titleAccent: "kami.", intro: "Produk dan harga semasa.",
    search: "Cari produk", categories: "Kategori produk", all: "Semua produk", sort: "Susun mengikut", nameSort: "Nama: A–Z", lowSort: "Harga: rendah ke tinggi", highSort: "Harga: tinggi ke rendah",
    clear: "Kosongkan penapis", noMatches: "Tiada produk yang sepadan.", noMatchesBody: "Cuba nama lain atau kosongkan penapis.", empty: "Belum ada produk untuk dipaparkan.", emptyBody: "",
    view: "Lihat produk", photo: "Belum ada foto", unavailable: "Tidak tersedia buat masa ini", available: "Tersedia", details: "Penerangan", price: "Harga", regular: "Harga biasa", offers: "Promosi semasa", back: "Kembali ke produk", breadcrumb: "Jejak navigasi", home: "Laman utama", products: "Produk", imageLabel: "Foto produk",
    loading: "Memuatkan…", loadingBody: "", error: "Ada masalah.", errorBody: "Kami tidak dapat memuatkan halaman ini. Sila cuba lagi.", retry: "Cuba lagi", missing: "Halaman itu tidak dijumpai.", missingBody: "Halaman ini mungkin telah dipindahkan atau tidak lagi tersedia. Lihat produk semasa kami.",
  },
} as const;
