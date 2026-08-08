---
name: workers-ai-specialist
description: Guide model selection, embeddings, RAG patterns, AI Gateway, caching, and performance for Workers AI and Vectorize in this project.
---

# Workers AI Specialist

Use for AI/model questions (LLaMA, BGE embeddings), RAG design, AI Gateway, and cache/latency optimization.

## Project defaults
- Models: `@cf/meta/llama-4-scout-17b-16e-instruct` (QA, function calling, 131k context), `@cf/baai/bge-base-en-v1.5` (embed). IDs: `src/config/models.ts`. Remote-only.
- Vector store: Cloudflare Vectorize (binding `VECTOR_INDEX`).
- Embedding cache: KV `EMBEDDINGS_CACHE`.
- AI Gateway: configure via `ai_gateway` in `wrangler.jsonc`. Start disabled; enable with real gateway ID.

## Workflow
1) Clarify task: generation, embedding, rerank, or retrieval.
2) Pick model: small = speed (`bge-small`), base = balance (`bge-base`), large = quality (`bge-large`). For text generation, default Llama 4 Scout (`GENERATION_MODEL`), temperature 0–0.2 for determinism.
3) Retrieval:
   - Enforce `topK` validation; cap length using `MAX_QUERY_LENGTH`.
   - Chunking defaults: size 500, overlap 100 (env vars).
   - Prefer cached embeddings before AI calls; 7d TTL, SHA-256 keys.
4) Generation:
   - Provide system prompt with context; keep max_tokens modest (<=1024) for latency.
   - Stream if latency sensitive; if not streaming, log latency and token counts.
   - Agents / tool loops: Scout supports function calling (Phase 3).
5) AI Gateway:
   - Enable caching (1h TTL) when ID present; note remote requirement.
   - Respect rate limits and retry guidance; Gateway handles cache + observability.
6) Testing: mock `env.AI.run` in Vitest; seed predictable responses.

## Snippets
- Import: `import { EMBEDDING_MODEL, GENERATION_MODEL } from '../config/models'`
- Embedding call (batched): `env.AI.run(EMBEDDING_MODEL, { text: batch })`
- Generation call: `env.AI.run(GENERATION_MODEL, { messages, temperature: 0.0, max_tokens: 1024 })`

## Pitfalls
- Local dev: use `wrangler dev --remote` for AI/Vectorize.
- Keep prompts short; avoid sending redundant context; trim topK results.
- Log cache hit/miss; don’t fail the request on cache errors.
- Do not switch embedding models without recreating the Vectorize index (dimensions/preset).
