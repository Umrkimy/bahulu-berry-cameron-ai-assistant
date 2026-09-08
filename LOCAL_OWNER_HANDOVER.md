# Local Owner Handover Checklist

This checklist is for the local Bahulu Berry Cameron workspace only. Keep the
dashboard on the Owner's computer until a separately approved deployment is
ready.

## Start and check

1. From the project folder, run `docker compose up -d --build`.
2. Open the dashboard at `http://localhost:5173`.
3. Confirm the API is healthy at `http://localhost:8000/health` and ready at
   `http://localhost:8000/ready`.
4. The storefront preview is at `http://localhost:3000`; it is not a public
   launch.

## Owner and team access

1. Sign in with an active Owner account. Owners can manage the team, settings,
   products, approvals, and other operational controls.
2. In **Team & Roles**, add a Staff account only for a person who needs daily
   operational access. Use the person's own email address.
3. Deactivate, rather than delete, an account when a team member no longer
   needs access. This preserves the activity trail.
4. Use **Settings** to check email readiness. It shows delivery status, sender,
   and reset-link expiry but never displays provider secrets.

## Password reset email

1. Confirm the selected account is active and has an inbox controlled by that
   account holder.
2. In **Settings**, select the account and confirm **Send reset link**.
3. The link is single-use and expires after 30 minutes. Sending another link
   invalidates an earlier unused link.
4. For a delivery-only check, verify the sender, reset URL, and expiry in the
   received email. Do not set a new password.
5. For an actual password reset, the account holder must choose the new
   password. Completing it signs out older sessions for that account.

## Daily use boundaries

- In **Products**, Owners can download the product CSV template and use
  **Import CSV**. Preview the file first; import is available only when every
  row is valid. A successful import adds all products and opening stock to the
  current database together and never updates an existing product.
- The template columns are `name`, `category`, `description`, `price_myr`,
  `opening_stock`, and `low_stock_threshold`. Name, RM price, and opening stock
  are required; a blank low-stock threshold uses 10 units.
- Use **Updates** for live operational attention items and personal
  notification history. Live alerts disappear when their underlying issue is
  resolved; notification history is retained for 90 days.
- Review activity entries when checking who made an operational change.
- The WhatsApp workspace remains an internal simulator until Meta approval and
  live sending are explicitly enabled.
- Stripe remains test-mode work. Do not treat browser redirects as confirmed
  payments; confirmed payment state must come from verified webhooks.
- The storefront is a controlled preview. Do not publish product claims,
  prices, imagery, delivery details, opening hours, contact details, or
  checkout until the client has approved them.

## Security reminders

- Keep `.env`, API keys, sender credentials, reset URLs, customer data, and
  screenshots containing private information out of Git and public sharing.
- Docker services are intentionally bound to `localhost`; no public Cloudflare
  connector is running.
- Keep a backup of the Docker PostgreSQL volume before any future data cleanup,
  migration, or deployment work.
