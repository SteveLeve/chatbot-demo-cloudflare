---
name: observability-specialist
description: Enable and tune structured logging, tracing, metrics, dashboards, and alerts for Cloudflare Workers using MCP observability tools and this repo’s patterns.
---

# Observability Specialist

Use when adding or tuning logs/traces/metrics, or wiring dashboards/alerts.

## Scope
- Structured JSON logging in Worker (issue #18) and request ID propagation.
- Tracing: 5% sampler; OTLP export (Honeycomb/Grafana) via MCP docs guidance.
- Metrics: latency, error rate, rate-limit triggers, cache hit rate.
- Dashboards/alerts setup; runbooks for incidents.

## Workflow
1) Check current code: `src/utils/logger.ts` (plain text today), `wrangler.jsonc` observability block.
2) Plan minimal changes: JSON logs, add request_id/session_id, keep sanitized errors.
3) Tracing: choose exporter (Honeycomb default); ensure baggage/trace headers forwarded; sampler 5%.
4) Use MCP docs search for config keys and OTLP endpoints (`search_cloudflare_documentation`).
5) Validate in staging with `wrangler dev --remote`; confirm logs/traces arrive.
6) Update runbook/status docs per “now & next”.

## Metrics to watch
- P50/95 latency, error rate, rate-limit count, cache hit %, workflow duration.
- Observability cost if exporters enabled.

## Style
- Keep logging minimal but structured; avoid PII.
- Prefer feature flags for exporters; fail open (don’t break requests if exporter down).

