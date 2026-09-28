---
name: bahulu-resume
description: Resume Bahulu Berry Cameron work from the latest local handoff. Use when Umar says "bahulu resume", "resume", "pick up where we left off", or starts a new session on this repo. Also covers writing the handoff at the end of a session.
---

# Resume Bahulu Berry Cameron work

Handoffs are local notes in `docs/handoffs/` (never committed). The newest
one says where things stand and what comes next.

## Starting a session

1. Find the newest handoff: the latest `docs/handoffs/*.md` by filename date.
   If there is none, say so and fall back to `AGENTS.md` and `PRODUCT.md`.
2. Read, in order: that handoff, `AGENTS.md`, `PRODUCT.md`,
   `docs/quality-gate.md`, and any other doc the handoff names.
3. Check the live state, since the handoff may be stale:
   - `git status --short`, `git branch --show-current`, `git log --oneline -5`
   - `gh pr list --state open` for the PRs the handoff mentions
   - Recall any memory that the handoff or task relates to.
4. Report in a few lines: what's done, what's open (PRs, CI, uncommitted
   work), and the handoff's **Next** item. Point out anything that no longer
   matches the handoff.
5. If Umar gave a task with the command, start on it. Otherwise propose the
   handoff's next step and confirm before any large or outward-facing action.

The repo rules still apply: no commit, push, merge, deploy, live provider
calls or public content without Umar's explicit go-ahead in this session.

## Ending a session (writing the handoff)

When Umar asks for a handoff, or a session ends with work in flight:

1. Write `docs/handoffs/YYYY-MM-DD-<topic>.md` (date in Asia/Kuala_Lumpur).
2. Structure it as:
   - **Where things stand:** merged PRs, open PRs and CI, branches, local
     uncommitted work.
   - **What was built:** a short list, with the key files.
   - **Next:** the agreed next task, with enough context to start cold
     (files, existing code to reuse, decisions already made).
   - **Waiting on Umar / the client:** approvals, keys, content.
   - **Later:** the backlog.
   - **Local environment notes:** containers, ports, flags.
3. Carry forward still-open items from the previous handoff, then delete that
   older file so exactly one current handoff remains.
4. Never put secrets, customer data, tokens or reset links in a handoff.
