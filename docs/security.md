# Security baseline

This applies to the dashboard, API, storefront, CI, and any future deployment.
It does not replace an authorised production penetration test.

## Current controls

- Server-side authentication/roles, HttpOnly sessions, CSRF, trusted hosts,
  exact CORS origins, rate and request-size limits, safe errors, and security
  headers.
- Runtime rejection of wildcard hosts/origins and weak secrets outside local
  development; loopback-only local ports and private database networking.
- GitHub tests plus Bandit, dependency audits, Gitleaks, CodeQL, Trivy, and
  Dependabot.
- Backend-authoritative pricing, inventory and payments; signed/idempotent
  payment webhooks; audited Owner confirmation for consequential AI actions.
- JSON logs redact emails, phone numbers, tokens, cookies, `Authorization`
  values and message text; caller-supplied `X-Request-ID` values are accepted
  only when short and plain, so they cannot forge log lines.
- Backups are encrypted with age before they leave the backup container; only
  the public key is on the server.
- Optional processor: Sentry (off unless `SENTRY_DSN` is set; client-owned
  account). Sends error type, message and stack trace only, redacted, with no
  cookies, headers, bodies, query strings, user details or local variables.

## Secret and incident handling

- Treat a secret-scanner finding as possible exposure: revoke/rotate first,
  remove it from source/history as appropriate, and record the incident
  privately. Never paste the value into issues, logs, tests, screenshots, or
  chat.
- Production secrets live only in the provider secret manager. Rotate session
  secrets after admin-device compromise and provider keys after suspected
  exposure.
- Scanner exceptions require the finding, reason, owner, compensating control,
  and expiry in the PR; remove expired exceptions.

## Verification and deployment controls

- Verify session persistence/sign-out, CSRF rejection, login throttling,
  Owner/Staff permissions, safe activity logs, signed webhook rejection, and
  idempotent payment/refund transitions.
- Staging security scans run only against fresh fictional-data staging with
  written scope. Never scan production or another system without approval.
- Use patched non-root containers, private database networking, encrypted
  backups, least privilege, Cloudflare edge protection, conservative endpoint
  limits, monitoring, and tested rollback/restoration.
- Do not expose PostgreSQL. Restrict API origins and disable FastAPI docs in
  production. Multi-instance deployments need a shared/edge rate limiter.
- Rate limits key on the visitor address only when `TRUST_CLOUDFLARE_CLIENT_IP`
  is enabled: nginx and the storefront server then forward Cloudflare's
  `CF-Connecting-IP` as `X-Client-IP`. Enable it only when every public route
  passes through Cloudflare, or visitors could forge their address.
- Session cookies are `Secure` and state-changing requests require an allowed
  `Origin` in both staging and production. The dashboard sends a strict CSP and
  frame denial; the storefront currently blocks framing only, and a full script
  CSP with per-request nonces is outstanding. HSTS is set by the API in
  production and should be enabled at the Cloudflare edge.
- Keep endpoint, error-rate, restart, certificate, backup, and authentication
  alerts. Retain security reports only for authorised collaborators.
