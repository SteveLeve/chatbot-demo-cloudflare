# Performance Roadmap (Summary)

- **Last Updated**: 2026-08-19
- **Targets**: 41% cost reduction; 82% latency improvement on cached queries
- **Canonical Issues**: #12–#17 (closed: #12, #13, #16; #17 implemented)

## Now

- Measure cache hit rate and tune thresholds to hit 45ms cached latency.
- After deploy: live eval snapshot to decide whether #20 (BGE-Large) is worth a Vectorize recreate.

## Done

- Embedding cache (#12) — PR #28: KV + 7d TTL, hit/miss logging. Keys now include `EMBEDDING_MODEL` (#20 prep).
- Batch chunk insertion (#13) — PR #28: D1 batch API in `document-store.ts`.
- AI Gateway config (#16) — PR #28: `USE_AI_GATEWAY` + `AI_GATEWAY_ID` toggle.
- Workflow timeouts (#14) — 30s per embedding batch via `withTimeout()`.
- Workflow idempotency (#15) — deterministic IDs + upsert SQL.
- D1 query optimizations (#17) — skip unused JSON.parse on retrieval; `idx_chat_messages_session_created`; `PRAGMA optimize` in cron; batched chat chunk inserts.
- Reranking agent tool (#21) — `@cf/baai/bge-reranker-base` inside `retrieve_from_corpus`.

## Next

- BGE-Large cutover (#20) — gated on a live eval snapshot; cache keys and eval article ids are already safe for a swap.

## Links

- Historical detail: `../archive/PERFORMANCE_OPTIMIZATION.md`
- Related issues: #12–#17, #20, #21
