# Performance Roadmap (Summary)

- **Last Updated**: 2026-08-20
- **Targets**: 41% cost reduction; 82% latency improvement on cached queries
- **Canonical Issues**: #12–#17 (closed: #12, #13, #16, #17); #20 closed not planned; #21 implemented

## Now

- Measure cache hit rate and tune thresholds to hit 45ms cached latency.
- Harden live `POST /api/v1/eval/run` (subrequest fan-out + judge response coercion) so the Eval page rerun button works.

## Done

- Embedding cache (#12) — PR #28: KV + 7d TTL, hit/miss logging. Keys include `EMBEDDING_MODEL` (safe if the embedding model ever changes).
- Batch chunk insertion (#13) — PR #28: D1 batch API in `document-store.ts`.
- AI Gateway config (#16) — PR #28: `USE_AI_GATEWAY` + `AI_GATEWAY_ID` toggle.
- Workflow timeouts (#14) — 30s per embedding batch via `withTimeout()`.
- Workflow idempotency (#15) — deterministic IDs + upsert SQL.
- D1 query optimizations (#17) — skip unused JSON.parse on retrieval; `idx_chat_messages_session_created`; `PRAGMA optimize` in cron; batched chat chunk inserts.
- Reranking agent tool (#21) — `@cf/baai/bge-reranker-base` inside `retrieve_from_corpus`.
- BGE-Large cutover (#20) — **closed as not planned**. Live title-mapped Hit@K was 18/18 on `bge-base`; 1024-d index recreate not justified at demo scale.

## Next

- Curated corpus ingest so D1 `article_id` is the gold-set slug (eval title-mapping is a stopgap).
- Agent retrieve tool-loop / kebab path so #21 rerank traces show in the UI.

## Links

- Historical detail: `../archive/PERFORMANCE_OPTIMIZATION.md`
- Related issues: #12–#17, #20 (closed), #21
