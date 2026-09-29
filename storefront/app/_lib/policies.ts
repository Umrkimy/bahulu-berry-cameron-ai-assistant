type Text = { en: string; ms: string };
export type PolicySection = { heading: Text; paragraphs?: Text[]; list?: Text[] };
export type Policy = { slug: PolicySlug; title: Text; intro: Text; sections: PolicySection[] };
export type PolicySlug = "terms" | "privacy" | "shipping" | "refunds";

// DRAFT policies written for review. They have not been approved by the client
// or checked by a lawyer, so they render only when STOREFRONT_DRAFT_CONTENT=true.
// Shown instead of the draft until the client approves the wording.
export const policyPending = {
  en: "We’re preparing this policy. If you have a question in the meantime, message us on WhatsApp.",
  ms: "Kami sedang menyediakan polisi ini. Jika anda ada soalan buat masa ini, hantar mesej kepada kami di WhatsApp.",
};

export const policyUpdated = { en: "Last updated: 29 September 2026", ms: "Dikemas kini: 29 September 2026" };

const contact: PolicySection = {
  heading: { en: "Contact us", ms: "Hubungi kami" },
  paragraphs: [
    { en: "If you have any questions about this policy, contact Bahulu Berry Cameron:", ms: "Jika anda mempunyai sebarang soalan tentang polisi ini, hubungi Bahulu Berry Cameron:" },
  ],
  list: [
    { en: "Address: Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang", ms: "Alamat: Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang" },
    { en: "WhatsApp: 019-966 9316", ms: "WhatsApp: 019-966 9316" },
    { en: "Opening hours: daily, 9am–5:30pm", ms: "Waktu operasi: setiap hari, 9 pagi–5:30 petang" },
  ],
};

export const policies: Policy[] = [
  {
    slug: "terms",
    title: { en: "Terms & Conditions", ms: "Terma & Syarat" },
    intro: { en: "These Terms & Conditions apply to your use of this website and to orders placed with Bahulu Berry Cameron. By using the website or placing an order, you agree to them.", ms: "Terma & Syarat ini terpakai kepada penggunaan laman web ini dan pesanan yang dibuat dengan Bahulu Berry Cameron. Dengan menggunakan laman web ini atau membuat pesanan, anda bersetuju dengannya." },
    sections: [
      { heading: { en: "1. About us", ms: "1. Tentang kami" }, paragraphs: [{ en: "Bahulu Berry Cameron is a bakery in Tanah Rata, Cameron Highlands, Pahang, that makes and sells bahulu and berry-inspired products.", ms: "Bahulu Berry Cameron ialah bakeri di Tanah Rata, Cameron Highlands, Pahang, yang membuat dan menjual bahulu serta produk berinspirasikan beri." }] },
      { heading: { en: "2. Products and prices", ms: "2. Produk dan harga" }, paragraphs: [
        { en: "All prices are in Malaysian Ringgit (RM). We try to keep product details, photos and prices accurate, but products are handmade and may look slightly different from the photos.", ms: "Semua harga adalah dalam Ringgit Malaysia (RM). Kami berusaha memastikan maklumat, foto dan harga produk tepat, tetapi produk dibuat dengan tangan dan mungkin kelihatan sedikit berbeza daripada foto." },
        { en: "Prices and promotions may change without notice. The price that applies is the one confirmed with you when your order is accepted.", ms: "Harga dan promosi boleh berubah tanpa notis. Harga yang terpakai ialah harga yang disahkan bersama anda semasa pesanan diterima." },
      ] },
      { heading: { en: "3. Orders", ms: "3. Pesanan" }, paragraphs: [
        { en: "You can build an order in the cart on this website and send it to us on WhatsApp. Sending the message is a request to order; your order is confirmed only when we reply to confirm the items, total and collection or delivery details.", ms: "Anda boleh menyediakan pesanan dalam troli di laman web ini dan menghantarnya kepada kami di WhatsApp. Menghantar mesej itu ialah permintaan untuk membuat pesanan; pesanan anda hanya disahkan apabila kami membalas untuk mengesahkan item, jumlah dan butiran pengambilan atau penghantaran." },
        { en: "Our products are made in limited batches and sell out daily. If an item is unavailable, we’ll tell you and offer an alternative or remove it from your order.", ms: "Produk kami dibuat dalam kuantiti terhad dan habis dijual setiap hari. Jika sesuatu item tidak tersedia, kami akan memaklumkan anda dan menawarkan pilihan lain atau mengeluarkannya daripada pesanan anda." },
      ] },
      { heading: { en: "4. Payment", ms: "4. Pembayaran" }, paragraphs: [{ en: "We share payment details with you on WhatsApp after your order is confirmed. We begin preparing your order once payment has been received.", ms: "Kami berkongsi maklumat pembayaran di WhatsApp selepas pesanan anda disahkan. Kami mula menyediakan pesanan selepas pembayaran diterima." }] },
      { heading: { en: "5. Collection, delivery and refunds", ms: "5. Pengambilan, penghantaran dan bayaran balik" }, paragraphs: [{ en: "Delivery is covered by our Shipping Policy, and cancellations and refunds by our Cancellation & Refund Policy. Both form part of these terms.", ms: "Penghantaran diterangkan dalam Polisi Penghantaran kami, manakala pembatalan dan bayaran balik diterangkan dalam Polisi Pembatalan & Bayaran Balik. Kedua-duanya adalah sebahagian daripada terma ini." }] },
      { heading: { en: "6. Use of this website", ms: "6. Penggunaan laman web ini" }, paragraphs: [{ en: "You agree not to misuse this website, including attempting to disrupt it, access it without permission, or use it for anything unlawful.", ms: "Anda bersetuju untuk tidak menyalahgunakan laman web ini, termasuk cuba mengganggunya, mengaksesnya tanpa kebenaran, atau menggunakannya untuk tujuan yang menyalahi undang-undang." }] },
      { heading: { en: "7. Intellectual property", ms: "7. Harta intelek" }, paragraphs: [{ en: "The Bahulu Berry Cameron name, strawberry mascot, photos and text on this website belong to Bahulu Berry Cameron and may not be copied or used without our written permission.", ms: "Nama Bahulu Berry Cameron, maskot strawberi, foto dan teks di laman web ini adalah milik Bahulu Berry Cameron dan tidak boleh disalin atau digunakan tanpa kebenaran bertulis kami." }] },
      { heading: { en: "8. Limitation of liability", ms: "8. Had liabiliti" }, paragraphs: [{ en: "To the extent permitted by law, we are not responsible for indirect losses arising from the use of this website or our products. Nothing in these terms limits your rights under the Consumer Protection Act 1999.", ms: "Setakat yang dibenarkan oleh undang-undang, kami tidak bertanggungjawab atas kerugian tidak langsung akibat penggunaan laman web ini atau produk kami. Tiada apa-apa dalam terma ini yang mengehadkan hak anda di bawah Akta Perlindungan Pengguna 1999." }] },
      { heading: { en: "9. Governing law", ms: "9. Undang-undang yang terpakai" }, paragraphs: [{ en: "These terms are governed by the laws of Malaysia.", ms: "Terma ini ditadbir oleh undang-undang Malaysia." }] },
      { heading: { en: "10. Changes to these terms", ms: "10. Perubahan kepada terma ini" }, paragraphs: [{ en: "We may update these terms from time to time. The latest version is always on this page, with the date it was last updated.", ms: "Kami boleh mengemas kini terma ini dari semasa ke semasa. Versi terkini sentiasa dipaparkan di halaman ini bersama tarikh kemas kini terakhir." }] },
      contact,
    ],
  },
  {
    slug: "privacy",
    title: { en: "Privacy Policy", ms: "Polisi Privasi" },
    intro: { en: "This policy explains what personal data Bahulu Berry Cameron collects, why, and how we protect it, in line with Malaysia’s Personal Data Protection Act 2010 (PDPA).", ms: "Polisi ini menerangkan data peribadi yang dikumpul oleh Bahulu Berry Cameron, sebabnya, dan cara kami melindunginya, selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia." },
    sections: [
      { heading: { en: "1. What we collect", ms: "1. Data yang kami kumpul" }, list: [
        { en: "When you order or message us on WhatsApp: your name, phone number, the contents of your messages, and, for deliveries, your delivery address.", ms: "Apabila anda membuat pesanan atau menghantar mesej di WhatsApp: nama, nombor telefon, kandungan mesej anda, dan alamat penghantaran bagi penghantaran." },
        { en: "Order details such as the products, quantities, totals and payment confirmation.", ms: "Butiran pesanan seperti produk, kuantiti, jumlah dan pengesahan pembayaran." },
        { en: "This website does not ask you to create an account and does not use advertising or analytics cookies.", ms: "Laman web ini tidak meminta anda membuat akaun dan tidak menggunakan kuki pengiklanan atau analitik." },
      ] },
      { heading: { en: "2. Stored on your device", ms: "2. Disimpan pada peranti anda" }, paragraphs: [{ en: "Your cart (product numbers and quantities only) and your language choice are saved in your browser’s local storage so they are still there when you come back. They are not sent to us until you choose to send an order. You can clear them at any time by clearing your browser data.", ms: "Troli anda (nombor produk dan kuantiti sahaja) dan pilihan bahasa anda disimpan dalam storan tempatan pelayar supaya masih ada apabila anda kembali. Maklumat ini tidak dihantar kepada kami sehingga anda memilih untuk menghantar pesanan. Anda boleh memadamnya pada bila-bila masa dengan mengosongkan data pelayar anda." }] },
      { heading: { en: "3. How we use your data", ms: "3. Cara kami menggunakan data anda" }, list: [
        { en: "To confirm, prepare and deliver your order.", ms: "Untuk mengesahkan, menyediakan dan menghantar pesanan anda." },
        { en: "To reply to your questions and handle any issue with an order.", ms: "Untuk menjawab soalan anda dan menguruskan sebarang isu berkaitan pesanan." },
        { en: "To keep the records we must keep by law.", ms: "Untuk menyimpan rekod yang diwajibkan oleh undang-undang." },
      ], paragraphs: [{ en: "We do not sell your personal data, and we only send you promotions if you ask us to.", ms: "Kami tidak menjual data peribadi anda, dan kami hanya menghantar promosi jika anda memintanya." }] },
      { heading: { en: "4. Third-party services", ms: "4. Perkhidmatan pihak ketiga" }, paragraphs: [{ en: "Some features connect you to other companies, which handle your data under their own privacy policies:", ms: "Sesetengah ciri menghubungkan anda dengan syarikat lain, yang menguruskan data anda di bawah polisi privasi mereka sendiri:" }], list: [
        { en: "WhatsApp (Meta), when you press a WhatsApp button.", ms: "WhatsApp (Meta), apabila anda menekan butang WhatsApp." },
        { en: "Google Maps, which shows the map on our About page.", ms: "Google Maps, yang memaparkan peta di halaman Tentang kami." },
        { en: "TikTok, only after you press play on a video or open a TikTok link.", ms: "TikTok, hanya selepas anda menekan main pada video atau membuka pautan TikTok." },
        { en: "Couriers, who receive your name, phone number and address to deliver a posted order.", ms: "Syarikat kurier, yang menerima nama, nombor telefon dan alamat anda untuk menghantar pesanan pos." },
      ] },
      { heading: { en: "5. How long we keep it", ms: "5. Tempoh penyimpanan" }, paragraphs: [{ en: "We keep order records for as long as we need them for the order and to meet legal and accounting requirements, and then delete them.", ms: "Kami menyimpan rekod pesanan selama yang diperlukan untuk pesanan tersebut dan untuk memenuhi keperluan undang-undang serta perakaunan, dan kemudian memadamnya." }] },
      { heading: { en: "6. Your rights", ms: "6. Hak anda" }, paragraphs: [{ en: "Under the PDPA you can ask to see the personal data we hold about you, correct it, or withdraw your consent to us using it. Message us on WhatsApp and we’ll respond as soon as we can.", ms: "Di bawah PDPA, anda boleh meminta untuk melihat data peribadi yang kami simpan tentang anda, membetulkannya, atau menarik balik persetujuan anda untuk kami menggunakannya. Hantar mesej di WhatsApp dan kami akan membalas secepat mungkin." }] },
      { heading: { en: "7. Security", ms: "7. Keselamatan" }, paragraphs: [{ en: "We take reasonable steps to protect your personal data from loss, misuse and unauthorised access.", ms: "Kami mengambil langkah yang munasabah untuk melindungi data peribadi anda daripada kehilangan, penyalahgunaan dan akses tanpa kebenaran." }] },
      { heading: { en: "8. Changes to this policy", ms: "8. Perubahan kepada polisi ini" }, paragraphs: [{ en: "We may update this policy from time to time. The latest version is always on this page.", ms: "Kami boleh mengemas kini polisi ini dari semasa ke semasa. Versi terkini sentiasa dipaparkan di halaman ini." }] },
      contact,
    ],
  },
  {
    slug: "shipping",
    title: { en: "Shipping Policy", ms: "Polisi Penghantaran" },
    intro: { en: "You can collect your order from our shop in Tanah Rata or have it sent by post within Malaysia.", ms: "Anda boleh mengambil pesanan di kedai kami di Tanah Rata atau menghantarnya melalui pos di dalam Malaysia." },
    sections: [
      { heading: { en: "1. Collecting from the shop", ms: "1. Mengambil di kedai" }, paragraphs: [{ en: "Collect your order at Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang, during opening hours (daily, 9am–5:30pm). We’ll tell you on WhatsApp when your order is ready.", ms: "Ambil pesanan anda di Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang, dalam waktu operasi (setiap hari, 9 pagi–5:30 petang). Kami akan memaklumkan anda di WhatsApp apabila pesanan anda sedia." }] },
      { heading: { en: "2. Delivery by post", ms: "2. Penghantaran melalui pos" }, list: [
        { en: "We post to addresses in Peninsular Malaysia, Sabah and Sarawak using a courier.", ms: "Kami menghantar ke alamat di Semenanjung Malaysia, Sabah dan Sarawak menggunakan kurier." },
        { en: "Postage depends on your location and the size of your order. We confirm the charge with you on WhatsApp before you pay.", ms: "Caj pos bergantung pada lokasi anda dan saiz pesanan. Kami mengesahkan caj bersama anda di WhatsApp sebelum anda membayar." },
        { en: "We usually send orders within 1–3 working days after payment is received.", ms: "Kami biasanya menghantar pesanan dalam 1–3 hari bekerja selepas pembayaran diterima." },
        { en: "Delivery usually takes 1–3 working days in Peninsular Malaysia and 3–7 working days in Sabah and Sarawak once the parcel is sent.", ms: "Penghantaran biasanya mengambil masa 1–3 hari bekerja di Semenanjung Malaysia dan 3–7 hari bekerja di Sabah dan Sarawak selepas bungkusan dihantar." },
      ] },
      { heading: { en: "3. Tracking", ms: "3. Penjejakan" }, paragraphs: [{ en: "Once your parcel is sent, we’ll share the tracking number with you on WhatsApp.", ms: "Selepas bungkusan dihantar, kami akan berkongsi nombor penjejakan di WhatsApp." }] },
      { heading: { en: "4. Delays and addresses", ms: "4. Kelewatan dan alamat" }, paragraphs: [
        { en: "Courier delivery times are estimates and can be longer during public holidays, festive seasons or bad weather. Please check your address and phone number carefully; we can’t be responsible for delays caused by incorrect details.", ms: "Masa penghantaran kurier adalah anggaran dan mungkin lebih lama semasa cuti umum, musim perayaan atau cuaca buruk. Sila semak alamat dan nombor telefon anda dengan teliti; kami tidak bertanggungjawab atas kelewatan akibat maklumat yang salah." },
        { en: "Our bahulu are fresh baked goods, so please make sure someone can receive the parcel and open it soon after it arrives.", ms: "Bahulu kami ialah produk bakeri segar, jadi pastikan ada orang untuk menerima bungkusan dan membukanya sebaik sahaja tiba." },
      ] },
      { heading: { en: "5. Damaged parcels", ms: "5. Bungkusan rosak" }, paragraphs: [{ en: "If your order arrives damaged, see our Cancellation & Refund Policy for what to do.", ms: "Jika pesanan anda tiba dalam keadaan rosak, rujuk Polisi Pembatalan & Bayaran Balik kami untuk langkah seterusnya." }] },
      contact,
    ],
  },
  {
    slug: "refunds",
    title: { en: "Cancellation & Refund Policy", ms: "Polisi Pembatalan & Bayaran Balik" },
    intro: { en: "Our products are fresh food made in small batches, so we handle cancellations and refunds as follows.", ms: "Produk kami ialah makanan segar yang dibuat dalam kuantiti kecil, jadi pembatalan dan bayaran balik diuruskan seperti berikut." },
    sections: [
      { heading: { en: "1. Cancelling an order", ms: "1. Membatalkan pesanan" }, list: [
        { en: "You can cancel for a full refund before we start preparing your order. Message us on WhatsApp as soon as possible.", ms: "Anda boleh membatalkan pesanan dengan bayaran balik penuh sebelum kami mula menyediakannya. Hantar mesej di WhatsApp secepat mungkin." },
        { en: "Once your order has been prepared or posted, it can no longer be cancelled.", ms: "Selepas pesanan disediakan atau dihantar, ia tidak lagi boleh dibatalkan." },
      ] },
      { heading: { en: "2. Returns", ms: "2. Pemulangan" }, paragraphs: [{ en: "For food safety reasons, we can’t accept returns of food products, and we don’t offer refunds for a change of mind.", ms: "Atas sebab keselamatan makanan, kami tidak dapat menerima pemulangan produk makanan, dan kami tidak menawarkan bayaran balik kerana perubahan fikiran." }] },
      { heading: { en: "3. Damaged, wrong or missing items", ms: "3. Item rosak, salah atau tidak lengkap" }, paragraphs: [{ en: "If your order arrives damaged, incorrect or incomplete, message us on WhatsApp within 24 hours of receiving it, with your order details and clear photos of the items and packaging. After checking, we’ll offer a replacement or a full or partial refund.", ms: "Jika pesanan anda tiba dalam keadaan rosak, salah atau tidak lengkap, hantar mesej di WhatsApp dalam tempoh 24 jam selepas menerimanya, bersama butiran pesanan dan foto jelas item serta pembungkusan. Selepas semakan, kami akan menawarkan penggantian atau bayaran balik penuh atau sebahagian." }] },
      { heading: { en: "4. If we cancel", ms: "4. Jika kami membatalkan" }, paragraphs: [{ en: "If we can’t fulfil your order, for example because a product has sold out, we’ll tell you and refund what you paid for the affected items in full.", ms: "Jika kami tidak dapat memenuhi pesanan anda, contohnya kerana produk telah habis dijual, kami akan memaklumkan anda dan membayar balik sepenuhnya amaun yang dibayar bagi item terbabit." }] },
      { heading: { en: "5. How refunds are paid", ms: "5. Cara bayaran balik dibuat" }, paragraphs: [{ en: "Approved refunds are paid to the account you paid from, usually within 7 working days.", ms: "Bayaran balik yang diluluskan akan dibuat ke akaun yang anda gunakan untuk membayar, biasanya dalam tempoh 7 hari bekerja." }] },
      { heading: { en: "6. Your statutory rights", ms: "6. Hak berkanun anda" }, paragraphs: [{ en: "This policy does not affect your rights under the Consumer Protection Act 1999.", ms: "Polisi ini tidak menjejaskan hak anda di bawah Akta Perlindungan Pengguna 1999." }] },
      contact,
    ],
  },
];

export function findPolicy(slug: string): Policy | undefined {
  return policies.find((policy) => policy.slug === slug);
}
