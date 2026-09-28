# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The public storefront (`storefront/`, Next.js) serves three groups, confirmed by
Umar on 29 September 2026:

- Visitors to Cameron Highlands who want to pick up bahulu, often as a gift or
  souvenir.
- Local regulars who reorder products they already know.
- Customers elsewhere in Malaysia who cannot visit in person.

The admin dashboard (`frontend/`) serves the bakery's Owner and Staff, who
manage products, photos, inventory, promotions, orders, and support drafts.

## Product Purpose

Bahulu Berry Cameron is a real Malaysian bakery business. The storefront should
read as a proper bakery website: customers browse the current products, see
real prices in RM, and build an order. Most orders arrive on WhatsApp today. The
website is meant to become a real ordering channel for customers who prefer
ordering online, so the cart is a core feature and not a preview.

Success means a customer can find a product, understand its price and
availability, and place an order without confusion, in English or Bahasa Melayu.

## Positioning

Open decision. The name and existing copy point to bahulu with a berry-inspired
identity from Cameron Highlands. Any stronger claim (recipe, heritage,
ingredients, awards) needs the client's approval before it appears anywhere.

## Operating Context

- Orders are taken on WhatsApp by staff today. The website's own AI and
  WhatsApp tooling is draft-only and human-approved.
- Until online payment is live, the cart ends by opening WhatsApp with the
  order pre-filled as a draft that the customer sends themselves (decided
  29 September 2026). The number comes from environment configuration, never
  from source.
- The payment provider is undecided. ToyyibPay is on hold because of its fees,
  and HitPay is a possibility. Public checkout stays disabled until a provider,
  fulfilment rules, and policies are approved.
- Owners control product records, photos, the homepage feature, and homepage
  copy from the dashboard. The storefront reads only published content.

## Capabilities and Constraints

- Stack: React/Vite/Mantine admin, Next.js storefront, FastAPI with async
  SQLAlchemy and PostgreSQL. The backend owns inventory, promotions, totals,
  orders, and payments. Browser totals never decide anything.
- Currency is RM (MYR). Time zone is `Asia/Kuala_Lumpur`.
- Every customer-facing string exists in English and Bahasa Melayu, kept in
  step.
- Never invent business facts: products, descriptions, prices, policies,
  address, hours, pack sizes, availability, delivery terms, reviews.
- Approved to state (29 September 2026): the WhatsApp number, the location or
  address, and the opening hours. Use only the exact values Umar supplies.
- Not yet approved: pickup and delivery terms, lead times, delivery area,
  policies (privacy, terms, refunds), and the payment provider.

## Brand Commitments

- Name: Bahulu Berry Cameron.
- The strawberry mascot is the final brand character (confirmed 29 September
  2026) and should appear across the site. A separate logo or wordmark is not
  yet supplied.
- Voice: warm and plain. Friendly, not cute. No preview, concept, or
  "awaiting approval" language in public copy.

## Evidence on Hand

- Product records and photos come from the dashboard. Current descriptions and
  photos are placeholders the Owner will replace. Do not write product
  descriptions.
- `storefront/public/concept/bahulu-bag.webp` is the approved homepage fallback
  image when no featured product photo exists.
- No reviews, testimonials, press, or awards exist. Do not fabricate any.

## Product Principles

1. Truth over polish: an empty slot beats an invented fact.
2. Every action leads somewhere. Hide a control rather than show a dead end.
3. The backend is the authority on price, stock, and orders.
4. Bilingual parity: English and Bahasa Melayu ship together.
5. Keep character without clutter: the mascot carries the personality.

## Accessibility & Inclusion

WCAG 2.2 AA baseline: semantic structure, visible focus, keyboard operation,
meaningful alt text, touch targets, reduced-motion support, and UI text at
14px or larger.
