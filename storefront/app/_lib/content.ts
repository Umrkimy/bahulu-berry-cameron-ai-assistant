import type { HomepageContent } from "./types";

const noText = { en: "", ms: "" };

// Fallback used only when the published homepage cannot be loaded. The Owner
// edits the live wording in the dashboard. Eyebrow fields stay in the schema
// but the storefront no longer renders them.
export const defaultHomepage: HomepageContent = {
  hero: {
    eyebrow: noText,
    title_primary: { en: "Bahulu.", ms: "Bahulu." }, title_accent: { en: "Berry.", ms: "Berry." }, title_suffix: { en: "Cameron.", ms: "Cameron." },
    body: { en: "Browse our bahulu and current prices.", ms: "Lihat bahulu kami dan harga semasa." },
    cta_label: { en: "Browse products", ms: "Lihat produk" },
  },
  benefits: { enabled: false, eyebrow: noText, title: noText, items: Array.from({ length: 3 }, () => ({ title: noText, body: noText })) },
  collection: { eyebrow: noText, title: { en: "Our bahulu", ms: "Bahulu kami" }, view_all_label: { en: "View all products", ms: "Lihat semua produk" } },
  story: { eyebrow: noText, title: { en: "The bakery behind the bahulu", ms: "Bakeri di sebalik bahulu ini" }, body: { en: "Bahulu Berry Cameron is a Cameron Highlands bakery centred on bahulu and berry-inspired products.", ms: "Bahulu Berry Cameron ialah bakeri Cameron Highlands yang menumpukan bahulu dan produk berinspirasikan beri." }, cta_label: { en: "About us", ms: "Tentang kami" } },
  reviews: { enabled: false, eyebrow: noText, title: noText },
  location: { enabled: false, eyebrow: noText, title: noText, load_map_label: noText, directions_label: noText },
  closing: { eyebrow: noText, title: { en: "Browse all our products", ms: "Lihat semua produk kami" }, body: { en: "Current products and prices from Bahulu Berry Cameron.", ms: "Produk dan harga semasa daripada Bahulu Berry Cameron." }, cta_label: { en: "Browse products", ms: "Lihat produk" } },
  google_place_id: null,
};

// Approved by Umar on 29 September 2026 (address, WhatsApp, hours, map).
export const business = {
  hours: { en: "Open daily, 9am–5:30pm (until sold out)", ms: "Dibuka setiap hari, 9 pagi–5:30 petang (sehingga habis dijual)" },
  // Google Maps "Embed a map" share URL, shown on the About page.
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3977.634300310369!2d101.3800129!3d4.4788545!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31ca590066263efb%3A0x47ce3ff6e6722a41!2sBahulu%20Berry%20Cameron!5e0!3m2!1sen!2smy!4v1790615230149!5m2!1sen!2smy",
  addressLines: ["Kg Taman Sedia, Selorong KHM", "39000 Tanah Rata, Pahang"],
  town: "Tanah Rata, Cameron Highlands",
  phoneDisplay: "019-966 9316",
  mapsUrl: "https://www.google.com/maps/place/Bahulu+Berry+Cameron/@4.4788545,101.3800129,17z/data=!4m6!3m5!1s0x31ca590066263efb:0x47ce3ff6e6722a41!8m2!3d4.4788545!4d101.3800129",
} as const;

export const social = {
  tiktokHandle: "@bahuluberrycameron",
  tiktokUrl: "https://www.tiktok.com/@bahuluberrycameron",
  facebookUrl: "https://www.facebook.com/p/Bahulu-Berry-Cameron-61571178085895",
} as const;

// Most-viewed videos on the shop's TikTok as of 29 September 2026. Order = display order.
export const tiktokVideoIds = ["7646792404988660999", "7560309627712294152", "7655544972535483655", "7572942928092368146"] as const;

export type Stat = { value: string; label: { en: string; ms: string } };

// TikTok figures are real, from the shop's public profile on 29 September 2026.
// "Packs sold" and "flavours" were confirmed by Umar on 29 September 2026.
export const stats: Stat[] = [
  { value: "27.5K", label: { en: "followers on TikTok", ms: "pengikut di TikTok" } },
  { value: "576.6K", label: { en: "likes on TikTok", ms: "suka di TikTok" } },
  { value: "20K+", label: { en: "packs sold", ms: "pek terjual" } },
  { value: "6", label: { en: "flavours", ms: "perisa" } },
];

export const copy = {
  en: {
    visitTitle: "Visit us", openMaps: "Open in Google Maps", whatsApp: "WhatsApp", hoursLabel: "Opening hours", mapTitle: "Map to Bahulu Berry Cameron",
    navProducts: "Products", navAbout: "About", home: "Home", language: "English", enquire: "Ask us on WhatsApp",
    aboutTitle: "About Bahulu Berry Cameron", aboutText: "A Cameron Highlands bakery centred on bahulu and berry-inspired products.",
    contactTitle: "Questions about an order?", contactText: "Message us on WhatsApp with any questions about our products or your order.",
  },
  ms: {
    visitTitle: "Kunjungi kami", openMaps: "Buka di Google Maps", whatsApp: "WhatsApp", hoursLabel: "Waktu operasi", mapTitle: "Peta ke Bahulu Berry Cameron",
    navProducts: "Produk", navAbout: "Tentang", home: "Laman utama", language: "Bahasa Melayu", enquire: "Tanya kami di WhatsApp",
    aboutTitle: "Tentang Bahulu Berry Cameron", aboutText: "Bakeri Cameron Highlands yang menumpukan bahulu dan produk berinspirasikan beri.",
    contactTitle: "Ada soalan tentang pesanan?", contactText: "Hubungi kami di WhatsApp untuk sebarang pertanyaan tentang produk atau pesanan anda.",
  },
} as const;

export function money(value: string): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(value));
}

export const homeCopy = {
  en: {
    imageAlt: "Illustration of golden bahulu in a clear bag with the Bahulu Berry Cameron strawberry label",
    statsTitle: "Bahulu Berry Cameron in numbers",
    videosTitle: "Watch us on TikTok", videosIntro: "Our most-watched videos from the shop.", play: "Play video", videosNote: "Videos load from TikTok when you press play.", follow: "Follow us on TikTok",
    chat: "Chat with us on WhatsApp",
    viewProduct: "View product", loading: "Loading products…", errorTitle: "We couldn’t load the products.", errorBody: "Please try again.", retry: "Try again",
    emptyTitle: "No products to show yet.",
    skip: "Skip to content", navigation: "Main navigation", chooseLanguage: "Choose language",
  },
  ms: {
    imageAlt: "Ilustrasi bahulu keemasan dalam beg lutsinar dengan label strawberi Bahulu Berry Cameron",
    statsTitle: "Bahulu Berry Cameron dalam angka",
    videosTitle: "Tonton kami di TikTok", videosIntro: "Video kedai kami yang paling banyak ditonton.", play: "Main video", videosNote: "Video dimuatkan daripada TikTok apabila anda tekan main.", follow: "Ikuti kami di TikTok",
    chat: "Sembang dengan kami di WhatsApp",
    viewProduct: "Lihat produk", loading: "Memuatkan produk…", errorTitle: "Kami tidak dapat memuatkan produk.", errorBody: "Sila cuba lagi.", retry: "Cuba lagi",
    emptyTitle: "Belum ada produk untuk dipaparkan.",
    skip: "Langkau ke kandungan", navigation: "Navigasi utama", chooseLanguage: "Pilih bahasa",
  },
} as const;
