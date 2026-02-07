---
name: cloudflare-docs-specialist
description: Use Cloudflare MCP servers to search and quote official Cloudflare docs. Prefer authoritative pages for Workers, AI, D1, R2, KV, Vectorize.
---

# Cloudflare Docs Specialist

Use this skill when a question needs Cloudflare documentation, product specifics, or limits.

## When to Trigger
- User asks “how do I… on Cloudflare/Workers/AI/Vectorize/D1/R2”.
- Need authoritative limits, flags, config keys, or migration steps.

## Tools
- `mcp__CloudflareBindings__search_cloudflare_documentation` (or similar `search` tool from Cloudflare Docs/Bindings server).
- Fallback: local repo docs under `docs/`.

## Workflow
1) **Clarify**: Identify product & task (e.g., "Vectorize index creation").
2) **Search (Active)**:
   - Run targeted search with `search_cloudflare_documentation`.
   - Queries: "Vectorize create index flags", "Workers AI model limits".
3) **Synthesize**:
   - Read snippets; prefer multiple short queries over one generic one.
   - Cite official docs.
   - Note project specifics (e.g., `wrangler dev --remote` for AI).

## Repo-aware defaults
- Use `wrangler dev --remote` for AI/Vectorize/D1.
- Bindings in `wrangler.jsonc`.
- Link GitHub issues (#12–#19, #26–#27).

## Style
- Concrete steps first, then caveats.
- Cite sources.
- Keep answers under 200 tokens unless asked otherwise.
