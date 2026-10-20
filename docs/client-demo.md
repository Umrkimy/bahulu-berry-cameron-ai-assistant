# Private client demo

A 10–15 minute walkthrough on your laptop, shared over a video call (for
example Google Meet). Everything runs locally with fictional records and
Stripe **test mode**: no real money, no real customers, nothing on the
internet. Draft wording is listed in [draft-content.md](draft-content.md).

## Before the call (5 minutes)

1. Start Docker Desktop, then from the repository root:
   ```bash
   docker compose --profile stripe-test up -d --build
   ```
   The `stripe-test` profile forwards Stripe test payments to the API so
   orders turn "Paid" by themselves. It refuses anything but a test key.
2. Check: storefront `http://localhost:3000`, dashboard
   `http://localhost:5173`, and `http://localhost:8000/ready` shows `ready`.
   Use `localhost`, not `127.0.0.1`: the API only accepts the dashboard from
   `localhost`, and the other address shows "Can't reach the dashboard server".
3. Local `.env` must have these demo switches (already set on Umar's laptop):
   `STOREFRONT_CHECKOUT_ENABLED=true`, `STOREFRONT_CHECKOUT_PREVIEW_ENABLED=true`,
   `STOREFRONT_ACCOUNTS_ENABLED=true`, `STOREFRONT_DRAFT_CONTENT=true`,
   `EMAIL_PROVIDER=console`, Stripe **test** keys.
4. Share only the browser window. Close terminals, `.env` files and
   notifications first.

## Walkthrough

**Storefront (the customer's view)**

1. Home: the mascot hero, the TikTok numbers, the product collection, the most-watched TikTok
   videos (they load only when played), FAQ, and BM/English switch in the header.
2. Products → a product page: photos, price and stock, quantity, add to cart,
   "Ask us on WhatsApp", "Collect from our shop", related products.
3. Cart → **Pay online** → contact details → delivery address → review →
   consent → Stripe's test page. Pay with card `4242 4242 4242 4242`, any
   future expiry, any CVC. You land on "Thank you" with an order number and
   a private tracking link.
4. **My account** (person icon): enter the same email used at checkout. In
   demo mode the six-digit code appears on the page (in production it is
   emailed). Show **My orders** with the new order, then My details,
   optional password, **Download my data** and **Delete account** (PDPA).
5. Footer → Track my order: find the order by number and phone.

**Dashboard (the bakery's view)**

6. Sign in as the local Owner. Show Today/Updates, then the new website order
   under Orders: mark it dispatched with a courier and tracking number.
7. Refresh the customer's tracking page or My orders: the status and courier
   now show. (Status emails appear as `email_console_delivery` log lines.)
8. Products: edit a description or photo, save, and refresh the storefront.
9. Storefront homepage: edit draft headings, publish, refresh.
10. WhatsApp and the Berry staff assistant: a cited draft reply that staff approve
    before anything is sent; an action preview that needs explicit Owner
    confirmation.

## Close with the boundaries

This is a private demo on fictional data. Before launch the client needs to
approve: product descriptions and photos, policies and FAQ wording (EN/BM),
pickup and delivery terms and charges, the payment provider (Stripe test now;
HitPay or ToyyibPay possible), customer accounts and order emails, and
hosting (recommended plan in [hosting-coolify.md](hosting-coolify.md)).

## After the call

```bash
docker compose --profile stripe-test stop stripe-listen
```

Stop everything with `docker compose down` (never add `-v`; volumes hold the
local data).
