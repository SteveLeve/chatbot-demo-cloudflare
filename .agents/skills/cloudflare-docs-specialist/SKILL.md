---
name: cloudflare-docs-specialist
description: Use Cloudflare MCP servers to search and quote official Cloudflare docs; prefer authoritative pages for Workers, AI, D1, R2, KV, Vectorize, Queues, and deployment guidance.
---

# Cloudflare Docs Specialist

Use this skill when a question needs Cloudflare documentation, product specifics, or the latest platform behavior.

## When to Trigger
- User asks “how do I… on Cloudflare/Workers/AI/Gateway/Vectorize/D1/R2/KV/Queues/DO/Pages”.
- Need authoritative limits, flags, config keys, or migration steps.
- Need to cite docs or compare old vs new behavior.

## Tools
- `mcp__CloudflareBindings__search_cloudflare_documentation` (primary; returns doc chunks). If unavailable, fall back to local repo docs under `docs/`.
- Prefer multiple queries if first result looks generic.

## Workflow (tight loop)
1) Clarify product & operation (e.g., “Workers AI embeddings via AI Gateway”).
2) Run targeted search with product keyword + task (e.g., "AI Gateway cache TTL" or "D1 batch"), limit to few results.
3) Read snippets; open more if needed; avoid loading entire manuals.
4) Synthesize concise answer with cites; include version/flag names and defaults; note remote-only constraints for Workers AI/Vectorize.
5) Record key command/config snippets that fit the repo (Hono + wrangler). Keep it short.

## Repo-aware defaults
- Use `wrangler dev --remote` for AI/Vectorize/D1 in this project.
- Bindings live in `wrangler.jsonc`; cite binding names as seen there.
- Link GitHub issues when relevant (#12–#19, #26–#27).

## Style
- Lead with the concrete steps; then add cautions/limits.
- Cite sources; prefer official docs over blogs.
- Keep answers under 200 tokens unless asked otherwise.

