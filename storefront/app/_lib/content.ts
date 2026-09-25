import type { Locale } from "./types";

export const copy = {
  en: {
    navProducts: "Products", navPickup: "Pickup & delivery", navAbout: "About", browse: "Browse products", enquire: "Enquire on WhatsApp", available: "Available", unavailable: "Currently unavailable", regularPrice: "Regular price", offers: "Current offers", back: "Back to products", catalogue: "Our catalogue", catalogueIntro: "Browse the products currently approved for the storefront.", noProducts: "Products will appear here once they are approved for the storefront.", heroEyebrow: "Bahulu Berry Cameron", heroTitle: "Bakery treats, ready for your next visit.", heroText: "Explore the current collection and speak directly with the team on WhatsApp for availability and arrangements.", pickupTitle: "Pickup & delivery", pickupText: "Pickup and local delivery arrangements are confirmed directly with the team so each order can be handled with care.", aboutTitle: "About Bahulu Berry Cameron", aboutText: "A Cameron Highlands bakery centred on bahulu and berry-inspired products.", contactTitle: "Questions about an order?", contactText: "Message the team on WhatsApp for current availability, pickup, or delivery arrangements.", language: "BM", imagePending: "Product image awaiting approval", notFound: "This product is not currently available.", home: "Home",
  },
  ms: {
    navProducts: "Produk", navPickup: "Ambil & penghantaran", navAbout: "Tentang", browse: "Lihat produk", enquire: "Tanya di WhatsApp", available: "Tersedia", unavailable: "Tidak tersedia buat masa ini", regularPrice: "Harga biasa", offers: "Promosi semasa", back: "Kembali ke produk", catalogue: "Katalog kami", catalogueIntro: "Lihat produk yang kini diluluskan untuk laman pelanggan.", noProducts: "Produk akan dipaparkan di sini selepas diluluskan untuk laman pelanggan.", heroEyebrow: "Bahulu Berry Cameron", heroTitle: "Kudapan bakeri untuk kunjungan anda yang seterusnya.", heroText: "Terokai koleksi semasa dan hubungi pasukan kami di WhatsApp untuk ketersediaan serta urusan pesanan.", pickupTitle: "Ambil & penghantaran", pickupText: "Urusan ambil sendiri dan penghantaran tempatan akan disahkan terus bersama pasukan kami supaya setiap pesanan diurus dengan teliti.", aboutTitle: "Tentang Bahulu Berry Cameron", aboutText: "Bakeri Cameron Highlands yang menumpukan bahulu dan produk berinspirasikan beri.", contactTitle: "Ada soalan tentang pesanan?", contactText: "Hubungi pasukan kami di WhatsApp untuk ketersediaan, ambil sendiri, atau urusan penghantaran semasa.", language: "EN", imagePending: "Imej produk menunggu kelulusan", notFound: "Produk ini tidak tersedia buat masa ini.", home: "Laman utama",
  },
} as const;

export function money(value: string): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(value));
}

export const homeCopy = {
  en: {
    preview: "Private design preview", previewShort: "A LITTLE PREVIEW", eyebrow: "HELLO FROM BAHULU BERRY CAMERON",
    intro: "Meet Bahulu Berry Cameron. Take a closer look at our collection.", browse: "Browse products", explore: "A little more to discover",
    imageAlt: "Concept illustration of golden bahulu in a clear bag with a strawberry mascot label", mockupLabel: "Product mockup · for design review", imageUnavailable: "Product preview unavailable",
    collectionEyebrow: "TAKE A CLOSER LOOK", collectionTitle: "Meet the collection", viewAll: "View all products", viewProduct: "Explore product", photoPending: "Product photo coming later",
    loading: "Opening the collection…", loadingBody: "The product details are on their way.", errorTitle: "The collection is taking a little break.", errorBody: "We couldn’t load the products. Please try again.", retry: "Try again",
    emptyTitle: "A little space for what’s next.", emptyBody: "Our product collection will appear here once it’s ready to share.",
    storyEyebrow: "A FACE TO REMEMBER", storyTitle: "Say hello to Bahulu Berry Cameron.", storyBody: "Bahulu, a berry-inspired identity, and a character of our own. Get to know the name behind the collection.", about: "Meet Bahulu Berry Cameron",
    conceptNote: "Private preview · Brand treatment awaits approval. Products and photos are managed by the Owner.",
    skip: "Skip to content", navigation: "Main navigation", switchLanguage: "Switch language to Bahasa Melayu",
  },
  ms: {
    preview: "Pratonton reka bentuk peribadi", previewShort: "SEBUAH PRATONTON", eyebrow: "SALAM DARI BAHULU BERRY CAMERON",
    intro: "Kenali Bahulu Berry Cameron dan terokai koleksi kami.", browse: "Lihat produk", explore: "Terokai dengan lebih dekat",
    imageAlt: "Ilustrasi konsep bahulu keemasan dalam beg lutsinar dengan label maskot strawberi", mockupLabel: "Mockup produk · untuk semakan reka bentuk", imageUnavailable: "Pratonton produk tidak tersedia",
    collectionEyebrow: "LIHAT DENGAN LEBIH DEKAT", collectionTitle: "Kenali koleksi kami", viewAll: "Lihat semua produk", viewProduct: "Terokai produk", photoPending: "Foto produk akan ditambah nanti",
    loading: "Memuatkan koleksi…", loadingBody: "Maklumat produk sedang dimuatkan.", errorTitle: "Koleksi belum dapat dipaparkan.", errorBody: "Kami tidak dapat memuatkan produk. Sila cuba lagi.", retry: "Cuba lagi",
    emptyTitle: "Ruang untuk sesuatu yang bakal tiba.", emptyBody: "Koleksi produk kami akan dipaparkan di sini apabila sedia untuk dikongsi.",
    storyEyebrow: "WAJAH UNTUK DIKENALI", storyTitle: "Salam daripada Bahulu Berry Cameron.", storyBody: "Bahulu, identiti berinspirasikan beri, dan karakter tersendiri. Kenali nama di sebalik koleksi kami.", about: "Kenali Bahulu Berry Cameron",
    conceptNote: "Pratonton peribadi · Olahan jenama menunggu kelulusan. Produk dan foto diurus oleh Pemilik.",
    skip: "Langkau ke kandungan", navigation: "Navigasi utama", switchLanguage: "Switch language to English",
  },
} as const;
