type Text = { en: string; ms: string };
export type FaqItem = { question: Text; answer: Text; draft?: boolean };

// `draft: true` answers are not yet confirmed by the client and render only
// when STOREFRONT_DRAFT_CONTENT=true. The rest restate approved facts.
// No halal, allergen or ingredient claims: those questions go to WhatsApp.
export const faqItems: FaqItem[] = [
  {
    question: { en: "Where is your shop?", ms: "Di manakah kedai anda?" },
    answer: { en: "We’re at Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang, in Cameron Highlands. Open the About page for a map and directions.", ms: "Kami berada di Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang, di Cameron Highlands. Buka halaman Tentang untuk peta dan arah." },
  },
  {
    question: { en: "What are your opening hours?", ms: "Bilakah waktu operasi anda?" },
    answer: { en: "We’re open daily from 9am to 5:30pm, or until we sell out for the day.", ms: "Kami dibuka setiap hari dari 9 pagi hingga 5:30 petang, atau sehingga stok habis dijual pada hari itu." },
  },
  {
    question: { en: "How do I place an order?", ms: "Bagaimana saya boleh membuat pesanan?" },
    answer: { en: "Add the products you want to your cart and press Send order on WhatsApp. Your order opens in WhatsApp, ready to send, and we’ll confirm it with you there. You can also visit the shop in person.", ms: "Tambah produk yang anda mahu ke troli dan tekan Hantar pesanan di WhatsApp. Pesanan anda akan dibuka dalam WhatsApp, sedia untuk dihantar, dan kami akan mengesahkannya bersama anda di sana. Anda juga boleh datang terus ke kedai." },
  },
  {
    draft: true,
    question: { en: "Do you deliver outside Cameron Highlands?", ms: "Adakah anda menghantar ke luar Cameron Highlands?" },
    answer: { en: "Yes. We send orders by post to addresses across Malaysia. Postage depends on your location and order size, and we’ll confirm the charge and estimated delivery time on WhatsApp before you pay.", ms: "Ya. Kami menghantar pesanan melalui pos ke alamat di seluruh Malaysia. Caj pos bergantung pada lokasi dan saiz pesanan, dan kami akan mengesahkan caj serta anggaran masa penghantaran di WhatsApp sebelum anda membayar." },
  },
  {
    draft: true,
    question: { en: "How can I pay?", ms: "Bagaimana saya boleh membayar?" },
    answer: { en: "We share payment details with you on WhatsApp once your order is confirmed. We start preparing your order after payment is received.", ms: "Kami akan berkongsi maklumat pembayaran di WhatsApp selepas pesanan anda disahkan. Kami mula menyediakan pesanan selepas pembayaran diterima." },
  },
  {
    draft: true,
    question: { en: "How should I store my bahulu?", ms: "Bagaimana cara menyimpan bahulu?" },
    answer: { en: "Bahulu are best enjoyed fresh. Keep them in an airtight container at room temperature, away from heat and direct sunlight. Ask us on WhatsApp how long your order will keep.", ms: "Bahulu paling sedap dinikmati segar. Simpan dalam bekas kedap udara pada suhu bilik, jauh daripada haba dan cahaya matahari. Tanya kami di WhatsApp berapa lama pesanan anda boleh disimpan." },
  },
  {
    draft: true,
    question: { en: "Can I order in bulk for an event?", ms: "Bolehkah saya membuat pesanan pukal untuk majlis?" },
    answer: { en: "Yes. Message us on WhatsApp with the quantity and the date you need it, and we’ll confirm availability and pickup or delivery with you.", ms: "Boleh. Hantar mesej di WhatsApp dengan kuantiti dan tarikh yang anda perlukan, dan kami akan mengesahkan ketersediaan serta cara ambil atau penghantaran bersama anda." },
  },
  {
    question: { en: "Where can I find ingredient or allergen information?", ms: "Di manakah saya boleh mendapatkan maklumat bahan atau alergen?" },
    answer: { en: "Message us on WhatsApp before you order and we’ll answer any questions about ingredients, allergens or certification for the products you want.", ms: "Hantar mesej di WhatsApp sebelum membuat pesanan dan kami akan menjawab sebarang soalan tentang bahan, alergen atau pensijilan bagi produk yang anda mahu." },
  },
];
