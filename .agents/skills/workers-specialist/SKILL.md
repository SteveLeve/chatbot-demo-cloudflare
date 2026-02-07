---
name: workers-specialist
description:
    Provide Cloudflare Workers runtime guidance for routing, bindings, performance, security headers, rate limiting, and Hono patterns used in this repo.
---

# Workers Specialist

Use when implementing or reviewing Cloudflare Workers code (Hono API, bindings, middleware, performance hardening).

## Scope
- Routing and middleware (Hono) for `/api/*`, health, and ingestion workflow endpoints.
- Bindings: D1, R2, KV, Vectorize, Workflows, RateLimiters as defined in `wrangler.jsonc`.
- Security hardening: CORS, headers, validation, sanitized errors, rate limits (issues #6–#11, PRs #22/#23).
- Performance tweaks: caching (KV, AI Gateway), batching, chunking, request limits.

## Workflow
1) Inspect `wrangler.jsonc` for bindings and env vars; assume remote-only for AI/Vectorize.
2) Check `src/index.ts`, `src/utils/*`, `src/patterns/*`, `src/ingestion-workflow.ts` for current patterns.
3) When adding routes/middleware, follow existing Hono structure; reuse validation helpers and logger.
4) Keep security headers and CORS applied globally; add route-specific rate limits via `checkRateLimit`.
5) Prefer batch DB ops (D1 `batch`) and KV caches where possible.
6) For changes, add tests (Vitest) and update docs under `docs/` per “now & next” rule.

## Quick references
- Health/info routes pattern in `src/index.ts`.
- Rate limiting helpers in `src/utils/rate-limiter.ts`.
- Logger in `src/utils/logger.ts`; structured JSON is upcoming (#18).
- Ingestion workflow steps in `src/ingestion-workflow.ts`.

## Style
- Keep handlers small; push logic into utils/patterns.
- Avoid blocking I/O; favor async/await and minimal awaits inside loops.
- Log with context objects; sanitize errors before returning.

