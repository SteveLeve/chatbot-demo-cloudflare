# Runbook: Enable Structured Logging & Tracing
- **Last Updated**: 2026-02-06
- **Owner**: Platform/Observability
- **Prereqs**: Wrangler access; target observability backend creds (e.g., Honeycomb/Grafana agent endpoints)

## When to Run
- Initial observability rollout or when rotating credentials/endpoints.

## Steps
1. JSON logging is built-in: logs are emitted as single-line JSON with `requestId`, `traceId`, `spanId`, and `sessionId` context.
2. Tracing sampler defaults to **5%**; configure OTLP export via env:
   - `TRACE_ENABLED=true` (default)
   - `TRACE_SAMPLE_RATE=0.05`
   - `OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces` (example)
   - `OTLP_AUTH_HEADER=X-Honeycomb-Team`, `OTLP_AUTH_VALUE=<key>`
   - `OTLP_SERVICE_NAME=cloudflare-rag-portfolio`
3. Request middleware now injects and returns `x-request-id` and `traceparent` headers for correlation.
4. Deploy to staging; validate logs/traces in destination (filter by `service.name` and `deployment.environment`).
5. Deploy to production.

## Validation
- Logs visible with expected correlation IDs (requestId/traceId) and endpoint metadata.
- Traces sampled at expected rate; no exporter errors in Wrangler logs.

## Rollback
- Disable exporter feature flag or revert deployment to previous commit.

## Notes
- Historical analysis: `../archive/OBSERVABILITY_ANALYSIS_REPORT.md` and `../archive/OBSERVABILITY_SETUP.md`.
- Track work in issue #18.
