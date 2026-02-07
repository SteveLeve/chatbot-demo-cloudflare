---
name: workers-ai-specialist
description: Guide model selection, embeddings, RAG patterns, and performance for Workers AI and Vectorize. Active model testing via Bindings MCP.
---

# Workers AI Specialist

Use for AI/model questions (LLaMA, BGE embeddings), RAG design, AI Gateway, and **verifying model outputs**.

## Project defaults
- Models: `@cf/meta/llama-3.1-8b-instruct` (QA), `@cf/baai/bge-base-en-v1.5` (embed). Remote-only.
- Vector store: Cloudflare Vectorize (binding `VECTOR_INDEX`).
- Embedding cache: KV `EMBEDDINGS_CACHE` (issue #12).
- AI Gateway: `ai_gateway` in `wrangler.jsonc` (issue #16).

## Tools
- `mcp__CloudflareBindings__workers_ai_run`: Run models directly to test prompts/outputs.
- `mcp__CloudflareBindings__vectorize_query`: Query the vector index to verify embeddings.
- `mcp__CloudflareBindings__kv_get/put`: Inspect/manipulate the embedding cache.

## Workflow
1) **Test First (Active)**:
   - Use `workers_ai_run` to test prompts with LLaMA before writing code.
   - Use `vectorize_query` to check if relevant chunks exist for a query.
2) **Implement**:
   - Retrieval: Enforce `topK`, chunking (500/100), and use cache (7d TTL).
   - Generation: Stream if latency-sensitive; use system prompt.
   - AI Gateway: Enable caching (1h TTL).
3) **Verify (Active)**:
   - After deploying, run `vectorize_query` to confirm new documents are indexed.
   - Check `ai_gateway` logs (via Observability MCP if available) for cache hits.

## Snippets
- Embedding call: `env.AI.run('@cf/baai/bge-base-en-v1.5', { text: batch })`
- Generation call: `env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages, temperature: 0.0 })`

## Pitfalls
- Local dev: use `wrangler dev --remote`.
- Keep prompts short; trim results.
