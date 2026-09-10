# Security baseline

This document is the operational reference for the Bahulu Berry Cameron project. It applies to the admin dashboard, API, storefront, CI workflows, and future deployment. It does not replace a professional penetration test before handling live payments or customer data.

## Current controls

- Server-side authentication, role checks, CSRF protection, request-size limits, trusted hosts, explicit CORS origins, rate limits, and secure response headers are built into the API.
- Runtime configuration rejects wildcard hosts/origins and weak application secrets in staging and production modes.
- Docker uses separate services and private internal database networking. Local ports bind to `127.0.0.1` by default.
- GitHub Actions runs tests, Bandit, pip-audit, npm audit, Gitleaks, CodeQL, and Trivy repository/image scans.
- Dependabot checks Python, npm, Docker, and GitHub Action dependencies weekly.

## Security workflow

- Treat a Gitleaks finding as a possible credential leak. Revoke and replace the credential first, remove it from source and history as appropriate, then record the incident privately. Never paste the secret into an issue, log, test, or chat.
- CI blocks secrets and fixable Critical dependency/image vulnerabilities. High findings are reported for review; resolve them promptly or document why they are not exploitable.
- Trivy reports are GitHub Actions artifacts retained for 30 days. They may contain dependency and path details, so share them only with authorised project collaborators.
- Do not create broad scanner exclusions. A temporary exception requires the finding identifier, reason, owner, compensating control, and expiry date in the pull request and this document. Remove the exception when it expires.

## Staging ZAP scans

- The `Staging security scans` workflow runs manually and weekly against a fresh GitHub-hosted Docker stack using placeholder values and a newly created empty database.
- It runs passive baseline scans for the dashboard and storefront, plus an API scan from the local FastAPI OpenAPI contract. It never targets localhost on a developer computer, a public domain, production, real accounts, or real data.
- The initial scans are report-only. Review the reports, correct genuine issues, and approve the expected clean baseline before turning newly introduced High/Critical alerts into a blocking scheduled check.
- Run Strix or another authorised penetration test only against a documented staging scope, or a production scope with written approval, agreed rate limits, and a rollback/contact plan. It is not part of this free baseline.

## Deployment checklist

- Use managed hosting with timely OS/runtime patching, non-root containers, private database networking, encrypted backups, and a secrets manager. Do not place an antivirus product inside application containers.
- Put public traffic behind Cloudflare. Enable managed WAF rules, DDoS protection, and conservative rate limits for login, password reset, API authentication, checkout, and webhook endpoints. Test rules in log/challenge mode before blocking.
- Expose no PostgreSQL port publicly. Restrict the API origin to the frontend/storefront and Cloudflare path selected for deployment.
- Store only production secrets in the hosting provider's secret manager; never in Git, Docker images, browser variables, client-side code, logs, or support tickets.
- Add Sentry and uptime monitoring after the hosting provider is selected. Alert on API readiness failures, repeated restarts, unexpected error-rate spikes, certificate expiry, backup failure, and unusual authentication failures.
- Keep Windows Defender and Windows updates enabled on development devices. For production, rely on managed-host patching, image scanning, firewalling, access control, and monitored logs rather than an in-container antivirus.
