# Product Quality and Launch Gate

This is the mandatory product-quality reference for Bahulu Berry Cameron.
Review it before a meaningful feature, commit, demo share, integration, or
deployment. It is an internal engineering checklist, not legal advice and not
approval to publish customer-facing policy text.

For local operating, private-demo, and recovery instructions, use the
[Owner Operations Runbook](OWNER_OPERATIONS_RUNBOOK.md).

## 1. Demo-safe now

The current Cloudflare demo remains private and must not add:

- fake reviews, testimonials, ratings, or unsupported social proof;
- unapproved business address, phone, email, operating hours, delivery area,
  product fact, price, promotion, halal, health, availability, payment, or
  WhatsApp claim;
- public checkout, live payment acceptance, live WhatsApp messaging, customer
  intake forms, marketing tracking, analytics pixels, or non-essential cookies;
- third-party embeds without an approved purpose, privacy review, and removal
  path.

The current public storefront is catalogue/enquiry-only. Security cookies for
the authenticated dashboard are essential; do not add a cookie banner unless
non-essential cookies or tracking are introduced.

## 2. Public-launch approval gate

Before publishing legal pages, public forms, checkout, or marketing, obtain
client approval for English and Bahasa Melayu versions of:

- Privacy Notice, Terms and Conditions, Refund/Returns policy, Delivery/Pickup
  policy, and Cookie Notice;
- legal business name, registration details where applicable, physical address,
  customer email, phone, complaint contact, and a named page owner;
- products, images, image-rights evidence, full price and all charges, payment
  methods, fulfilment coverage/timing, cancellation/refund handling, and
  dispute process;
- every processor or embed, what data it receives, the purpose, retention,
  cross-border handling, opt-in/opt-out behaviour, and removal procedure.

Use the Malaysian PDPA and electronic-trade materials as references, then ask
the client to obtain qualified local advice where needed:

- [JPDP PDPA guidance](https://www.pdp.gov.my/ppdpv1/en/faq/)
- [KPDN Consumer Protection (Electronic Trade Transactions) Regulations 2024](https://repositori.kpdn.gov.my/bitstream/123456789/5299/1/PERATURAN%20URUSNIAGA%20PERDAGANGAN%20DALAM%20ELEKTRONIK%202024.pdf)

## 3. Ongoing engineering gate

Record each item as **verified**, **not applicable**, or **awaiting client
approval**, with a short evidence link or note.

### Content, trust, and data

- Maintain one approved-content register for product facts, prices,
  promotions, images, business identity/contact details, delivery coverage,
  operating hours, and WhatsApp wording.
- Keep proof of permission, licence, or ownership for every public image,
  logo, video, review, and testimonial. Never copy social proof or use
  fabricated claims.
- Collect only data necessary for the stated purpose; use clear, separate
  consent for optional marketing. State retention, access/correction/deletion
  routes, and do not reuse data for unrelated purposes.
- Maintain a third-party/data register for Cloudflare, Resend, Stripe, OpenAI,
  Meta/WhatsApp, and any future analytics or embed: purpose, data shared,
  client owner, approval, policy disclosure, and disable/remove procedure.

### Accessibility and usability

- Meet WCAG 2.2 AA contrast as the baseline; check colour is never the only
  status indicator.
- Provide meaningful alt text for informative images and empty alt text for
  decorative images. Check image source and copyright before publishing.
- Use semantic headings, labelled controls, clear button names, useful inline
  errors, visible keyboard focus, logical tab order, no keyboard traps, and
  touch-friendly responsive controls.
- Check loading, empty, error, confirmation, and destructive-action states on
  phone, tablet, and desktop. Wide tables must scroll or render readable cards.

### Privacy, security, and operations

- Classify every cookie and tracker as essential or non-essential. Add informed
  opt-in/withdrawal before any non-essential processing; do not load it before
  consent.
- Review third-party scripts/embeds for origin, privacy policy, CSP impact,
  data flow, accessibility, and a removal path.
- Keep secrets and personal data out of Git, logs, screenshots, prompts, and
  demos. Use least privilege, verified webhooks, rate limits, backups, tested
  restores, dependency scans, and incident/secret-rotation procedures.
- Verify payment status only from provider-signed events. Do not promise
  payment, delivery, refund, stock, or support outcomes that the system cannot
  actually provide.

### Efficient verification policy

Use the smallest check that gives useful evidence while actively building:

- for a focused change, run the relevant targeted test, type/lint check, or
  inspection only;
- before a local commit, run the relevant frontend/backend tests and `git diff
  --check`;
- before a push, private-demo rebuild, deployment, security-sensitive change,
  migration, integration, or cross-application change, run the full relevant
  lint, test, production-build, and health/readiness checks;
- do not rebuild Docker or run browser checks for ordinary isolated UI changes
  unless they affect Docker, authentication, integration, responsive layout,
  or the requested demo.

Record any deliberately deferred full verification with the next commit or
demo-release evidence.

## Evidence required before release

For a demo share or production release, confirm:

1. no fake reviews, unlicensed imagery, unsupported claims, or placeholder
   policies are public;
2. current colour/keyboard/form/image checks pass and any exception is tracked;
3. all public data collection, tracking, embeds, and cookies have a documented
   purpose and approval state;
4. tests, lint/build, security checks, Docker health/readiness, and `git diff
   --check` pass;
5. public launch additionally has the client-approved policy and business-data
   package above, a backup-restore rehearsal, monitoring, rollback owner, and
   production security review.
