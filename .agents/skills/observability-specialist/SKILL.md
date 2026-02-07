---
name: observability-specialist
description: Enable and tune structured logging, tracing, metrics, dashboards, and alerts for Cloudflare Workers using MCP observability tools and this repo’s patterns. Active debugging via Observability MCP.
---

# Observability Specialist

Use when adding or tuning logs/traces/metrics, wiring dashboards/alerts, or **debugging live issues**.

## Scope
- Structured JSON logging in Worker (issue #18) and request ID propagation.
- Tracing: 5% sampler; OTLP export (Honeycomb/Grafana) via MCP docs guidance.
- Metrics: latency, error rate, rate-limit triggers, cache hit rate.
- **Active Debugging**: Using Observability MCP to inspect live logs and metrics.

## Tools
- `mcp__CloudflareObservability__*`: Use these to fetch live logs, metrics, and analytics.
- `mcp__CloudflareBindings__search_cloudflare_documentation`: For config keys and OTLP endpoints.

## Workflow
1) **Diagnose First (Active)**:
   - Before writing code, use Observability MCP tools to inspect recent errors (e.g., `tail_logs`, `get_analytics`).
   - Identify root causes: latency spikes, 429s, or specific error messages.
2) **Plan Changes**:
   - JSON logs: Ensure `request_id` and `session_id` are propagated.
   - Tracing: Default to Honeycomb; ensure baggage/trace headers forwarded; sampler 5%.
3) **Implement**:
   - Update `src/utils/logger.ts` or `wrangler.jsonc`.
   - Keep sanitized errors to avoid PII leaks.
4) **Verify (Active)**:
   - Deploy changes (`wrangler deploy` or dev session).
   - Use Observability MCP tools again to confirm logs are arriving and errors are resolved.

## Metrics to watch
- P50/95 latency, error rate, rate-limit count, cache hit %, workflow duration.
- Observability cost if exporters enabled.

## Style
- Keep logging minimal but structured; avoid PII.
- Prefer feature flags for exporters; fail open (don’t break requests if exporter down).
