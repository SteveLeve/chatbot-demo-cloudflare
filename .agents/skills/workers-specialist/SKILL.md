---
name: workers-specialist
description: Provide Cloudflare Workers runtime guidance for routing, bindings, performance, security headers, rate limiting, and Hono patterns. Active state inspection via Bindings MCP.
---

# Workers Specialist

Use when implementing or reviewing Cloudflare Workers code (Hono API, bindings, middleware) or **inspecting remote state**.

## Scope
- Routing and middleware (Hono) for `/api/*`.
- Bindings: D1, R2, KV, Vectorize, Workflows, RateLimiters.
- **Active Inspection**: Using Bindings MCP to view D1 data, KV keys, and Queue depth.
- Security hardening & Performance tweaks.

## Tools
- `mcp__CloudflareBindings__*`: Use these to inspect D1, KV, R2, and Queues directly.
- `mcp__CloudflareBindings__search_cloudflare_documentation`: For authoritative API references.

## Workflow
1) **Inspect State (Active)**:
   - Use Bindings MCP tools to verify current state before coding (e.g., `d1_query`, `kv_list`, `r2_list`).
   - Check `wrangler.jsonc` for binding names (assume remote-only for AI/Vectorize).
2) **Implement**:
   - Check `src/index.ts`, `src/patterns/*` for existing patterns.
   - Use `src/utils/rate-limiter.ts` and `logger.ts`.
   - Prefer batch DB ops and KV caches.
3) **Verify (Active)**:
   - After deploying, use Bindings MCP to verify data was written/modified correctly.
   - Run simple smoke tests against the endpoints.

## Quick references
- Health/info routes pattern in `src/index.ts`.
- Logger in `src/utils/logger.ts`.
- Ingestion workflow steps in `src/ingestion-workflow.ts`.

## Style
- Keep handlers small; push logic into utils/patterns.
- Avoid blocking I/O; favor async/await.
- Log context objects; sanitize errors.
