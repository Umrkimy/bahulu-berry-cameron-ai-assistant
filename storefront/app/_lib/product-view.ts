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
    eyebrow: "THE BAHULU BERRY COLLECTION", title: "Meet the", titleAccent: "collection.", intro: "Take a closer look. Find a little something with character.",
    search: "Search products", categories: "Product categories", all: "All products", sort: "Sort by", nameSort: "Name: A–Z", lowSort: "Price: low to high", highSort: "Price: high to low",
    clear: "Clear filters", noMatches: "Nothing here just yet.", noMatchesBody: "Try a different name or clear your filters to see the collection.", empty: "A little space for what’s next.", emptyBody: "Products will appear here once the collection is ready to share.",
    view: "Take a closer look", photo: "Product photo coming later", unavailable: "Currently unavailable", available: "Available", details: "A closer look", detailsEmpty: "More product details will appear here once they are ready to share.", price: "Price", regular: "Regular price", offers: "Current offers", back: "Back to the collection", browse: "Keep exploring", browseBody: "There’s more to see in the Bahulu Berry collection.", breadcrumb: "Breadcrumb", home: "Home", products: "Products", imageLabel: "Product photograph",
    loading: "Opening the collection…", loadingBody: "The product details are on their way.", error: "A little pause in browsing.", errorBody: "We couldn’t load this page. Please try again.", retry: "Try again", missing: "This one isn’t here.", missingBody: "This product may no longer be available. Take a look at the current collection.", enquiryPending: "Product enquiries are not available in this preview.",
  },
  ms: {
    eyebrow: "KOLEKSI BAHULU BERRY", title: "Kenali", titleAccent: "koleksi kami.", intro: "Lihat dengan lebih dekat. Terokai koleksi dengan karakter tersendiri.",
    search: "Cari produk", categories: "Kategori produk", all: "Semua produk", sort: "Susun mengikut", nameSort: "Nama: A–Z", lowSort: "Harga: rendah ke tinggi", highSort: "Harga: tinggi ke rendah",
    clear: "Kosongkan penapis", noMatches: "Tiada padanan buat masa ini.", noMatchesBody: "Cuba nama lain atau kosongkan penapis untuk melihat koleksi.", empty: "Ruang untuk sesuatu yang bakal tiba.", emptyBody: "Produk akan dipaparkan di sini apabila koleksi sedia untuk dikongsi.",
    view: "Lihat dengan lebih dekat", photo: "Foto produk akan ditambah nanti", unavailable: "Tidak tersedia buat masa ini", available: "Tersedia", details: "Lihat dengan lebih dekat", detailsEmpty: "Maklumat lanjut akan dipaparkan di sini apabila sedia untuk dikongsi.", price: "Harga", regular: "Harga biasa", offers: "Promosi semasa", back: "Kembali ke koleksi", browse: "Teruskan meneroka", browseBody: "Terokai lagi dalam koleksi Bahulu Berry.", breadcrumb: "Jejak navigasi", home: "Laman utama", products: "Produk", imageLabel: "Foto produk",
    loading: "Memuatkan koleksi…", loadingBody: "Maklumat produk sedang dimuatkan.", error: "Sebentar dalam penerokaan.", errorBody: "Kami tidak dapat memuatkan halaman ini. Sila cuba lagi.", retry: "Cuba lagi", missing: "Produk ini tiada di sini.", missingBody: "Produk ini mungkin tidak lagi tersedia. Terokai koleksi semasa kami.", enquiryPending: "Pertanyaan produk tidak tersedia dalam pratonton ini.",
  },
} as const;
