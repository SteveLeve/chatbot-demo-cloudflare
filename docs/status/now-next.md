# Status: Now & Next
- **Last Updated**: 2026-02-06
- **Owner**: Project Maintainer

## Now
- Security hardening completed; monitoring rollout for PR #22/#23 (issues #6–#11).
- Observability enhancements planned; structured logging and tracing tracked in issue #18.
- Compliance endpoints pending design/implementation (issue #19).

## Next
- Enable structured logging + tracing export (issue #18) and add dashboards.
- Implement privacy endpoints (export/delete/opt-out) and retention cron (issue #19).
- Performance/cache optimization pass to hit 45ms cached target; tie to upcoming issue/PR (see performance roadmap).

## Risks/Watch
- Rate limiting false positives during peak demo traffic — monitor logs.
- Compliance timeline risk if endpoints slip; create interim FAQ note if delayed.

## References
- Issues: #18 (observability), #19 (compliance), #6–#11 (security)
- PRs: #22, #23
