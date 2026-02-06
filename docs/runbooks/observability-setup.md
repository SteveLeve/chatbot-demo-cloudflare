# Runbook: Enable Structured Logging & Tracing
- **Last Updated**: 2026-02-06
- **Owner**: Platform/Observability
- **Prereqs**: Wrangler access; target observability backend creds (e.g., Honeycomb/Grafana agent endpoints)

## When to Run
- Initial observability rollout or when rotating credentials/endpoints.

## Steps
1. Enable JSON logging in Worker config/code path (issue #18).
2. Configure tracing sampler to 5% and wire OpenTelemetry exporter.
3. Add request ID propagation middleware; ensure logs include request_id, session_id.
4. Deploy to staging; validate logs and traces reach backend.
5. Deploy to production.

## Validation
- Logs visible in destination with structured fields.
- Traces sampled at expected rate; no exporter errors.

## Rollback
- Disable exporter feature flag or revert deployment to previous commit.

## Notes
- Historical analysis: `../archive/OBSERVABILITY_ANALYSIS_REPORT.md` and `../archive/OBSERVABILITY_SETUP.md`.
- Track work in issue #18.
