# Status: Now & Next
- **Last Updated**: 2026-02-06
- **Owner**: Project Maintainer

## Now
- Security hardening completed; monitoring rollout for PR #22/#23 (issues #6–#11).
- Performance quick wins landed (#12 embedding cache, #13 D1 batch inserts); AI Gateway live (#16).
- Observability phase 1 shipped: JSON logs with request/trace IDs; OTLP export flag ready (issue #18).
- Compliance endpoints pending design/implementation (issue #19).

## Next
- Wire OTLP destination + dashboards; add smoke tests for logging/cache retry (issue #18).
- Validate cache hit latency target (≤45ms cached) and adjust thresholds (#12/#13).
- Implement privacy endpoints (export/delete/opt-out) and retention cron (issue #19).

## Risks/Watch
- Rate limiting false positives during peak demo traffic — monitor logs.
- Compliance timeline risk if endpoints slip; create interim FAQ note if delayed.

## References
- Issues: #18 (observability), #19 (compliance), #6–#11 (security)
- PRs: #22, #23
