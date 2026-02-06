# ADR: Security Hardening for Chat Logging & Edge Worker
- **Date**: 2026-02-06
- **Status**: Accepted
- **Owners**: Security & Backend Team
- **Related Issues/PRs**: #6, #7, #8, #9, #10, #11, PR #22, PR #23

## Context
Security reviews surfaced risks around IP salt management, rate limiting, and hardening of the chat logging pipeline. Multiple GitHub issues (#6–#11) captured findings; PRs #22 and #23 implemented fixes. We need a canonical record of the chosen approach.

## Decision
- Store IP hash salt in Wrangler secrets, not in config files; validate presence at startup.
- Enforce per-IP rate limiting on chat endpoints.
- Tighten error handling and logging around chat logging workflow.
- Align with Cloudflare security guidance while keeping performance acceptable for edge execution.

## Consequences
- **Positive**: Eliminates plaintext/commit exposure of salts; reduces abuse risk; improves auditability.
- **Negative/Risks**: Requires secret rotation runbook; stricter limits may throttle heavy users.
- **Follow-ups**: Maintain salt-rotation runbook; monitor rate-limit false positives; keep issues #6–#11 closed as historical references.

## Alternatives Considered
- Keep salt in `wrangler.jsonc` vars — rejected due to leakage risk.
- Rely solely on Cloudflare WAF rate limits — rejected to retain app-level visibility and control.

## References
- PR #22, PR #23
- Issues #6–#11
- `docs/runbooks/security-salt-rotation.md`
