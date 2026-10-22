# WhatsApp assistant scope

Status: draft, agreed with Umar on 22 October 2026. Automatic sending needs the
client's approval before it goes live.

## Shape

The customer talks to Berry, the bakery's virtual assistant, on the business
WhatsApp number. It works like the Maxis WhatsApp flow:

1. **Menu.** Berry greets the customer with a numbered menu in their language.
   Menu replies are fixed text, or data read from the backend, and are sent
   automatically.
2. **Typed questions.** When the customer types instead of picking a number,
   Berry writes a draft answer from approved FAQs and knowledge articles. Staff
   approve or edit it in the admin before it is sent. Anything Berry cannot
   ground goes straight to staff.
3. **Staff.** The customer picks "Talk to our staff" or asks for a person.
   Berry asks what they need, sends a holding message, and the conversation
   lands in the admin inbox as `HUMAN_REQUESTED`. Berry stays quiet until staff
   hand the conversation back or close it.

## Sent automatically vs staff-approved

| Message | How it is sent |
| --- | --- |
| Greeting and menus | Automatic, fixed text set in the admin |
| Product list (name, RM price, in stock) | Automatic, read from the backend at send time |
| How to order | Automatic, fixed text with the storefront link |
| Order status | Automatic, read from the backend, only when the order matches the sender's phone |
| Opening hours and location | Automatic, the approved values |
| Holding message on handoff | Automatic, fixed text |
| Answers to typed questions | Draft, staff approve or edit |
| Anything staff write | Sent by staff from the admin |

Berry never confirms an order, takes payment, or promises a date. Staff take
orders by hand.

## Menu v1

English:

```
Hi! I'm Berry, Bahulu Berry Cameron's virtual assistant.
1  See our products and prices
2  How to order
3  Check my order
4  Opening hours and location
5  Talk to our staff
6  Tukar ke Bahasa Melayu
Reply with a number.
```

Bahasa Melayu:

```
Hai! Saya Berry, pembantu maya Bahulu Berry Cameron.
1  Lihat produk dan harga
2  Cara membuat tempahan
3  Semak tempahan saya
4  Waktu operasi dan lokasi
5  Bercakap dengan staf kami
6  Switch to English
Balas dengan nombor.
```

`*` returns to the main menu from any step. Wording above is a draft for Umar
and the client to review.

### 1. Products and prices

Published, in-stock products from the backend with RM prices, then the
storefront link. Out of stock items are shown as sold out, not hidden. No
descriptions beyond what the Owner has published.

### 2. How to order

Storefront link, and "reply 5 to order with our staff". No pickup or delivery
terms until the client approves them.

### 3. Check my order

Berry asks for the order number. If the order belongs to a customer with the
sender's phone number, Berry replies with its status and the tracking link.
Otherwise it says it could not find the order and offers option 5. It never
reveals another customer's order or details.

### 4. Opening hours and location

The values approved on 29 September 2026 in `storefront/app/_lib/content.ts`
(address, hours, map link). These move to admin settings so the bot and the
storefront read the same source.

### 5. Talk to our staff

"Sure. Tell us briefly what you need and our staff will reply here." Outside
opening hours it adds when staff are back. The next customer message is
attached to the ticket and Berry stops replying.

## Typed questions

- Berry answers only from active FAQs and knowledge articles (existing RAG in
  `support_copilot.py`). Below the similarity threshold it hands off.
- Always hands off: complaints, refunds, cancellations, orders, custom or bulk
  requests, payment, anything about health, and requests for a person
  ("staff", "orang", "live agent", "manusia", and similar).
- Never says: prices or stock not read from the backend; halal, allergen or
  ingredient claims; delivery areas, charges or lead times; policies that are
  not approved.

## Language

Berry replies in the customer's language (English or Bahasa Melayu, including
casual Malay such as "sya nk tanya"). Option 6 switches and is remembered for
the conversation.

## Meta rules

- Free replies are allowed only within 24 hours of the customer's last message.
  After that only approved Meta templates can be sent, and only by staff.
- Only the menu flows above are automatic. A setting turns automatic sending
  off, which falls back to draft-only.

## Change to the project rule

AGENTS.md currently says "WhatsApp remains draft-only until approved". Once the
client approves this scope it becomes: "On WhatsApp, only fixed menu replies and
backend data are sent automatically; AI answers and anything else stay
staff-approved."

## Build order

1. Backend menu flow on `MessagingConversation` (current step, language),
   menu text in the admin, outbound sending in `MetaWhatsAppAdapter` behind a
   setting that is off by default. Reuses `process_inbound_message`,
   `create_grounded_draft`, the handoff states and `record_activity`. Tested
   with the simulator adapter and fictional numbers.
2. Local test with the Meta test number and Umar's own phone (tunnel needs
   Umar's yes for that session).
3. Admin redesign: inbox first (conversations, thread, draft approve or edit,
   take over and hand back), with menu text, FAQs and rules under settings.

## Open questions

- Client approval of automatic menu replies.
- Final EN and BM wording of every menu message.
- Should the product list show a photo per product (WhatsApp image messages),
  or text only?
