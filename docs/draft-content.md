# Draft content register

Everything customers can read that is **not yet approved** by Umar and the
client. Replace or approve each item before public launch. Nothing here may
make halal, allergen, ingredient, award or review claims.

## In the code (draft wording, EN and BM)

| Content | File | Shown when |
| --- | --- | --- |
| FAQ answers beyond address and hours | `storefront/app/_lib/faq.ts` | `STOREFRONT_DRAFT_CONTENT=true` |
| Terms, Privacy, Shipping, Refund policies | `storefront/app/_lib/policies.ts` | `STOREFRONT_DRAFT_CONTENT=true` (otherwise "being prepared") |
| Account screens | `storefront/app/_lib/account-copy.ts` | `STOREFRONT_ACCOUNTS_ENABLED=true` |
| Order tracking labels | `storefront/app/_lib/tracking-copy.ts` | Checkout preview on |
| Checkout labels (BM from 30 September) | `storefront/app/_lib/cart-copy.ts` | Checkout preview on |
| Order status emails | `backend/app/services/customer_status_emails.py` | `CUSTOMER_STATUS_EMAILS_ENABLED=true` |
| Sign-in code email | `backend/app/services/customer_accounts.py` (`CODE_EMAIL`) | Accounts on |
| Product page "Collect from our shop" | `storefront/app/_lib/product-view.ts` | Always (uses approved address and hours) |

A native Bahasa Melayu reader should check all BM wording.

## In the database (owner-editable, local demo only)

These live in the local Docker database, not in Git. In production the Owner
enters the real values from the dashboard.

| Content | Where to change |
| --- | --- |
| Product descriptions for Bahulu berry, Bahulu Berry Coklat and Bahulu Durian (draft text written for the 12 October demo) | Dashboard → Products |
| Homepage headings and story text | Dashboard → Storefront homepage (publish) |
| Product photos (one is watermarked) | Dashboard → Products → Photos / Media |

## Approved facts (safe to show)

From Umar on 29 September 2026: WhatsApp number, shop address, opening hours,
map, TikTok follower and like counts, "20K+ packs sold", "6 flavours", and
the strawberry mascot. Product names and prices come from the dashboard.
