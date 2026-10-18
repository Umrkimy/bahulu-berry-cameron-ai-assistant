# Hosting on a VPS with Coolify

A step-by-step plan for the first production server. Planning only: buying a
server, pointing DNS and going live still need Umar's and the client's
approval (see `quality-gate.md` and `deployment.md`). Prices were checked on
12 October 2026 and change often; recheck before buying.

The domain is `bahuluberrycameron.com` (Umar's). Below, `<domain>` means that.
Until launch is approved the shop runs in **coming-soon mode** (section 4a):
the public sees a holding page and only people with the preview link see the
site.

## Which server

The stack (PostgreSQL + pgvector, FastAPI, Next.js storefront, nginx admin)
plus Coolify itself runs in **2 vCPU and 4 GB RAM** with 2 GB of swap, as long
as images are not built on the server (see step 4). Coolify alone needs at
least 2 CPUs, 2 GB RAM and about 30 GB of disk for images. Umar's budget is
under about US$5 a month.

| Option | Location | Spec | Approx. price / month | Notes |
| --- | --- | --- | --- | --- |
| **Hetzner CX23 (recommended)** | Germany (Falkenstein/Nuremberg) or Finland | 2 vCPU (x86), 4 GB, 40 GB, 20 TB traffic | €3.99 + €0.50 IPv4 = **€4.49** (~US$5.20, ~RM23) | Cheapest reliable option. Hourly billing, snapshots, simple firewall. Prices after Hetzner's April 2026 increase. |
| Hetzner CAX11 | Germany or Finland | 2 vCPU (ARM), 4 GB, 40 GB | €4.99 incl. IPv4 | Works, but every image must support ARM; no reason to pick it over CX23. |
| Hostinger KVM 2 | Kuala Lumpur, Malaysia | 2 vCPU, 8 GB, 100 GB NVMe | ~US$9 promo (2-year), ~$15 renewal | Upgrade path if Asia latency or RAM ever matter. |
| Contabo Cloud VPS | Singapore | 4 vCPU, 8 GB | ~US$8.40 incl. Singapore fee | Cheap per spec; slower support. |
| Hetzner | Singapore | — | ~RM136 for CPX22 | Too expensive in Asia. |

**Recommendation:** Hetzner **CX23 in Germany**, billed to the client's own
account, Ubuntu 24.04 LTS. Keep the IPv4 address: GitHub has no IPv6, so
Coolify could not pull the code from an IPv6-only server.

**What Germany means for Malaysian customers**

- Photos, scripts and styles are cached by Cloudflare in Kuala Lumpur, so
  they load as fast as from a local server.
- Pages and actions (add to cart, checkout, sign-in, dashboard clicks) go to
  Germany and back: about 0.2 s per round trip, so roughly 0.2–0.4 s more per
  page. Fine for a small shop; move to Hostinger KL if it ever matters.
- PDPA: storing personal data in the EU is allowed (comparable protection
  under GDPR). Add a line to the privacy policy saying the website's data is
  hosted in Germany before launch.

## Shape

```text
Visitors ──► Cloudflare (DNS, TLS, WAF, rate rules)
               ├─ <domain>       ─► Coolify proxy ─► storefront:3000
               ├─ www.<domain>   ─► redirect to <domain> (Cloudflare rule)
               └─ admin.<domain> ─► Coolify proxy ─► frontend:80 (nginx)
                                                    └─ /api ─► api:8000
               (api and db have no public address)
```

- The storefront server calls the API on the private Docker network
  (`STOREFRONT_SERVER_API_BASE_URL=http://api:8000/api`); browsers never call
  the API directly.
- The admin nginx proxies `/api/` to the API, so Stripe webhooks use
  `https://admin.<domain>/api/payments/webhook`.
- WhatsApp's `/webhooks/meta/whatsapp` is not proxied yet. Add an nginx
  `location /webhooks/` block when live WhatsApp is approved.

## 1. Prepare the server (about 20 minutes)

1. Create the VPS with your **SSH key** (no password login). Note the IP.
2. Log in as root once and harden it:
   ```bash
   adduser deploy && usermod -aG sudo deploy
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
   systemctl restart ssh
   apt update && apt -y upgrade && apt -y install unattended-upgrades fail2ban ufw
   dpkg-reconfigure -plow unattended-upgrades
   ```
   Add 2 GB of swap so a busy moment cannot run the 4 GB server out of memory:
   ```bash
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   sysctl vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
   ```
3. Firewall: use a **Hetzner Cloud Firewall** applied to the server (Docker
   cannot bypass it, unlike ufw). Inbound: ICMP, TCP 22, 80 and 443 from
   anywhere, plus TCP 8000 from your own IP only while setting up Coolify
   (delete it once Coolify has its domain). Leave outbound empty. Check that
   the firewall is listed under the server, then confirm from outside that
   8000, 6001 and 6002 are closed. `compose.yaml` still binds app ports to
   `127.0.0.1` only; never change those to `0.0.0.0`.

## 2. Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Open `http://<server-ip>:8000`, create the admin account immediately (the
first visitor becomes admin), enable 2FA, then give Coolify its own domain
(for example `coolify.<domain>`) and run `ufw delete allow 8000/tcp`.

## 3. Cloudflare in front

1. Move the domain's DNS to Cloudflare (free plan). Add proxied (orange cloud)
   `A` records for `@` (the bare domain), `www`, `admin` and `coolify`
   pointing at the server IP. Add a redirect rule from `www.<domain>` to
   `https://<domain>`.
2. SSL/TLS mode **Full (strict)**; "Always Use HTTPS" on; HSTS on once stable.
3. Lock the origin so nobody can bypass Cloudflare (and fake visitor IPs):
   either allow 80/443 only from [Cloudflare's IP ranges](https://www.cloudflare.com/ips/)
   in ufw, or use a Cloudflare Tunnel and close 80/443 entirely. Only then set
   `TRUST_CLOUDFLARE_CLIENT_IP=true`.
4. Add a rate-limiting rule for `/api/auth/token`,
   `/storefront-data/account/*` and `/storefront-data/checkout` as an extra
   layer over the app's own limits.
5. Hide the dashboard with **Cloudflare Access** (Zero Trust, free up to 50
   users), so strangers and bots never reach the sign-in page:
   - Zero Trust → Access → Applications → Self-hosted, domain
     `admin.<domain>`; a second application for `coolify.<domain>`.
   - Policy **Allow** → Include → *Emails*: list each person by exact
     address (Umar, the client, staff). Do not use "everyone" or a whole
     email domain such as gmail.com.
   - Login method: One-time PIN. Session duration: 24 hours.
   - Anyone not on the list gets Cloudflare's code screen and nothing else;
     the dashboard's own email and password sign-in still applies after it.
   - Before live Stripe or WhatsApp webhooks, add a **Bypass** policy for
     only those webhook paths (they are signature-checked by the API).
6. Leave **Bot Fight Mode off**: on the free plan it cannot exempt Stripe's
   webhook calls. Leave the shop itself without Access: visitors must reach
   the coming-soon page.
7. Stripe webhooks: a separate Access application for
   `admin.<domain>` path `api/payments/webhook` with a **Bypass / Everyone**
   policy. The API verifies Stripe's signature on every call.

## 4. Deploy the app in Coolify

1. **Project → New resource → Docker Compose** from the GitHub repository
   (install the Coolify GitHub App with access to this repo only). Branch
   `master`, compose file `compose.yaml`.
2. **Ports:** Coolify's own dashboard uses host port 8000, which clashes with
   the API's local binding. Set `API_PORT=18000`, and leave the
   `127.0.0.1` bind addresses as they are. Routing goes through Coolify's
   proxy by domain, not through these ports.
3. **Domains:** if the Domains page says "No services", reload the compose
   file in General first. Assign `https://<domain>` to `storefront` (port
   3000) and `https://admin.<domain>` to `frontend` (port 80). Delete the
   `www.admin.<domain>` entry Coolify adds (no DNS record; failed certificate
   requests can rate-limit Let's Encrypt) and set `www.<domain>` to redirect
   to `<domain>`. No domain for `api`, `db` or `migrate`.
4. **Environment variables** (Coolify → Environment, marked as secrets where
   sensitive). Start from `.env.example` and set at least:

   | Variable | Production value |
   | --- | --- |
   | `APP_ENVIRONMENT` | `production` |
   | `SECRET_KEY` | 64+ random characters (`openssl rand -hex 32`) |
   | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | new, random password |
   | `ALLOWED_ORIGINS` | `https://<domain>,https://admin.<domain>` |
   | `TRUSTED_HOSTS` | `admin.<domain>,<domain>,api,localhost` (the API healthcheck uses `localhost`) |
   | `VITE_API_BASE_URL` | `https://admin.<domain>/api` |
   | `VITE_STOREFRONT_BASE_URL` / `STOREFRONT_PUBLIC_URL` | `https://<domain>` |
   | `STOREFRONT_COMING_SOON` | `true` until launch is approved |
   | `STOREFRONT_PREVIEW_KEY` | `openssl rand -hex 24` (secret) |
   | `STOREFRONT_SERVER_API_BASE_URL` | `http://api:8000/api` |
   | `STOREFRONT_WHATSAPP_NUMBER` | approved number, digits only |
   | `TRUST_CLOUDFLARE_CLIENT_IP` | `true` only after step 3.3 |
   | `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_FROM` | `resend`, key, verified bakery sender |
   | `STRIPE_*` | test keys until live payments are approved |

   Keep every approval gate **false** until approved:
   `STOREFRONT_CHECKOUT_ENABLED`, `STOREFRONT_CHECKOUT_PREVIEW_ENABLED`,
   `STOREFRONT_ACCOUNTS_ENABLED`, `CUSTOMER_STATUS_EMAILS_ENABLED`,
   `STOREFRONT_DRAFT_CONTENT`, `STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED`,
   `PAYMENTS_LIVE_APPROVED`. The API refuses to start in production with weak
   secrets, wildcard origins or live keys without approval.
5. **Deploy.** The `migrate` service runs Alembic first; `api` waits for it.
   Check `https://admin.<domain>/api/ready` returns `"status":"ready"` with the
   latest revision. The database starts empty, so create the first Owner
   once from the server (`backend/scripts/` is not in the image):
   ```bash
   sudo docker exec -it $(sudo docker ps -qf name=api-) uv run --no-sync python -c "
   import asyncio, getpass
   from app.auth.password import hash_password
   from app.db.database import AsyncSessionLocal
   from app.models.admin import Admin
   async def main():
       email = input('Email: ').strip(); pw = getpass.getpass('Password (12+): ')
       assert len(pw) >= 12, 'too short'
       async with AsyncSessionLocal() as db:
           db.add(Admin(username='owner', email=email, password_hash=hash_password(pw), is_superuser=True, role='OWNER')); await db.commit()
       print('Owner created')
   asyncio.run(main())"
   ```
   Then sign in and add the other Owners and Staff from the dashboard.
6. Turn on **automatic deploys on push to `master`** only after a successful
   manual deploy. CI must be green before anything merges to `master`.
7. **Builds on a 4 GB server:** building the Next.js and admin images on the
   server can exhaust memory. Deploy one service at a time the first time,
   and if builds fail with "killed" or out-of-memory, build the images in
   GitHub Actions, push them to GitHub Container Registry, and point Coolify
   at those images instead of building.

## 4a. Private preview (coming soon)

With `STOREFRONT_COMING_SOON=true`:

- Every page shows a holding page (mascot, "coming soon" in English, and
  the WhatsApp button when the number is set). Search
  engines are told not to index anything and `robots.txt` disallows all.
- `https://<domain>/preview?key=<STOREFRONT_PREVIEW_KEY>` lets that browser
  in for 30 days (an HttpOnly cookie holding a hash, not the key). Send the
  link privately (WhatsApp to the client), not in a group or on social media.
- To revoke everyone, change `STOREFRONT_PREVIEW_KEY` and redeploy.
- Cart, checkout and account data routes return 404 to anyone without the
  cookie. Product photos stay reachable by direct address.
- `STOREFRONT_DRAFT_CONTENT=true` is acceptable only while coming-soon mode
  is on. Keep checkout, accounts and emails off for the preview.
- To launch: set `STOREFRONT_COMING_SOON=false` and redeploy, after the
  quality gate (section 6).

## 5. Backups and monitoring

- Backups: the `backup` compose profile writes age-encrypted dumps (see
  `operations.md`). Add a Coolify **Scheduled task** at 02:00 Asia/Kuala_Lumpur
  that runs it, and copy the files off-site (Cloudflare R2 or Backblaze B2 in
  the client's account). The age private key stays offline with the client.
- Rehearse a restore with `ops/backup/restore-test.sh` before launch.
- Uptime: a free monitor (UptimeRobot or Better Stack) on
  `https://<domain>/` and `https://admin.<domain>/api/health`, alerting
  the client and Umar. Cloudflare Access blocks the monitor on `admin.`, so
  give it an Access service token or a Bypass policy for `/api/health` only.
- Optional Sentry: set `SENTRY_DSN` (client-owned account).
- Coolify: enable its server disk-usage alerts and Docker cleanup schedule.

## 6. Before calling it live

Go through `quality-gate.md` and the "Before production" table in
`deployment.md`: approved content and policies, payment provider decision,
rollback owner, restore rehearsal, and a final security scan of staging (the
weekly ZAP workflow) on fresh fictional data.
