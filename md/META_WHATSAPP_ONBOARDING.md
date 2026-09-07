# Meta WhatsApp Cloud API onboarding

This system has a Meta WhatsApp Cloud API inbound webhook adapter, but it is
intentionally **draft-only**. It never sends a customer message. Staff reply
manually in WhatsApp after claiming a human-handoff ticket; the dashboard
provides cited internal drafts, ticket coordination, and a safe WhatsApp link.

Do not enable inbound intake until the business owner confirms this checklist.

## Before activation

1. The client owns a verified Meta Business account, Meta app, WhatsApp test number, billing, and recovery contacts. Use a production number only after the controlled test run passes.
2. The client approves bilingual FAQ/template content, business hours, consent wording, a named human-handoff owner, and the 30-day message-content retention policy.
3. Set server-only values: `WHATSAPP_META_APP_SECRET`, `WHATSAPP_META_VERIFY_TOKEN`, and `WHATSAPP_META_PHONE_NUMBER_ID`.
4. Keep `WHATSAPP_META_INBOUND_ENABLED=false` until Meta webhook verification succeeds in a non-production environment.
5. Configure Meta's callback URL as `https://api.your-domain.example/webhooks/meta/whatsapp`; the verify token must match the server value.
6. Confirm the responsible staff can access WhatsApp Business manually and understands that dashboard drafts are copyable assistance, not outbound messages.

## Safe local test

Use the Owner-only **Message simulator** for fictional messages. It exercises the same normalised intake and handoff service without Meta access or external messaging.

When a Meta test number is available, use a non-production environment and verify the webhook challenge first. Enable `WHATSAPP_META_INBOUND_ENABLED=true` only for the controlled test window. Confirm that invalid signatures and malformed events are rejected, duplicate message IDs create no extra ticket/activity, approved content creates only a cited draft, and risk/unknown cases create a high-priority human-handoff ticket.

After the test, set `WHATSAPP_META_INBOUND_ENABLED=false` again and review the safe activity trail. Do not enable a production number until the client confirms the test result and the approved content/policy decisions.

## Incident and rotation

- If the app secret or verify token is exposed, immediately set `WHATSAPP_META_INBOUND_ENABLED=false`, rotate the affected secret in Meta, update the server environment, and test signature verification again before re-enabling intake.
- Do not paste raw payloads, full chats, access tokens, or customer details into tickets, logs, screenshots, Git, or AI prompts.
- Review the dashboard activity trail and Meta delivery logs during an incident; this system stores only hashes and safe outcome metadata.
