# Product quality and launch gate

This is the mandatory internal gate for product, demo, integration, commit,
push, and deployment work. It is not legal advice or approval to publish
customer-facing content.

## Safe now

- Keep demos private and use fictional records.
- Do not publish fake reviews, unsupported claims, unlicensed imagery,
  placeholder policies, business details, operating hours, delivery coverage,
  public checkout, live payments, customer intake, live WhatsApp, tracking, or
  non-essential cookies.
- Checkout remains a disabled-by-default, non-submitting review. WhatsApp
  remains draft-only and staff-controlled.

## Client approval required before public launch

Obtain approved English and Bahasa Melayu versions of privacy, terms,
refund/returns, delivery/pickup, and cookie documents. Confirm the legal
business identity, address, contact routes, complaint owner, product content,
prices and all charges, image rights, fulfilment rules, payment methods, and
dispute process. Record every processor or embed, its purpose, data shared,
retention, cross-border handling, opt-out path, and client owner.

Use Malaysian PDPA and electronic-trade sources as references and recommend
qualified local review where needed:

- [JPDP PDPA guidance](https://www.pdp.gov.my/ppdpv1/en/faq/)
- [KPDN Electronic Trade Transactions Regulations 2024](https://repositori.kpdn.gov.my/bitstream/123456789/5299/1/PERATURAN%20URUSNIAGA%20PERDAGANGAN%20DALAM%20ELEKTRONIK%202024.pdf)

## Engineering gate

- Maintain approved-content and third-party/data registers.
- Keep evidence of ownership or licence for every public image, logo, video,
  review, and testimonial.
- Collect only necessary data, explain retention and rights, and keep optional
  marketing consent separate.
- Meet WCAG 2.2 AA as the baseline: semantic structure, visible focus, keyboard
  operation, useful errors, touch targets, meaningful alt text, and responsive
  loading/empty/error/destructive states.
- Keep secrets and personal data out of source, logs, screenshots, prompts, and
  demos. Use least privilege, signed/idempotent webhooks, rate limits, backups,
  restore rehearsals, dependency scans, and incident/rotation procedures.
- Verify payments only from provider-signed events. Never promise outcomes the
  system cannot guarantee.

## Verification policy

- During focused work, run the smallest targeted test or static check that
  gives useful evidence.
- Before a commit, run relevant tests and `git diff --check`.
- Before push, merge, demo rebuild, migration, integration, or deployment, run
  full relevant tests, lint, production builds, integration checks, security
  checks, and service health/readiness.
- Before public release, also verify approved content, privacy/cookie state,
  backup restoration, monitoring, rollback ownership, and production security.

Record each gate as verified, not applicable, or awaiting client approval.
