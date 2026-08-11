# Security Status

- **Last Updated**: 2026-08-10
- **Owner**: Security & Backend Team

## Current Posture

- IP salt moved to Wrangler secrets with validation (PR #22).
- Rate limiting enabled on chat endpoints (PR #22).
- Additional hardening completed across issues #8–#11 (PR #23).
- Security header integration tests (#27) and `__proto__` pollution test (#26) shipped.
- Chat sessions are now reused across turns of the same conversation (PR #49 review) instead of
  minting a new session id per query. Reuse is bounded by the same 30-minute
  `PRIVACY_ACTION_WINDOW_MS` window as self-service export/delete (`src/utils/privacy-data.ts`) —
  past that window, a leaked/guessed session id can no longer be used to append messages to someone
  else's session. `ChatLogger.initializeSession` also no longer echoes a session id to the client when
  session creation fails (previously a "phantom" id with no backing DB row could leak into
  `x-chat-session-id`).

## Next Actions

- Schedule salt rotation quarterly; follow `docs/runbooks/security-salt-rotation.md`.
- Monitor rate-limit metrics and adjust thresholds if demo traffic is throttled.
- Keep secrets inventory up to date in `wrangler.jsonc` bindings (no salts in vars).

## References

- Issues: #6–#11, #19, #26, #27
- PRs: #22, #23, #49
- Runbook: `docs/runbooks/security-salt-rotation.md`
