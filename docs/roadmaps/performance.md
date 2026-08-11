# Performance Roadmap (Summary)

- **Last Updated**: 2026-08-10
- **Targets**: 41% cost reduction; 82% latency improvement on cached queries
- **Canonical Issues**: #12–#17 (closed: #12, #13, #16)

## Now

- Measure cache hit rate and tune thresholds to hit 45ms cached latency.

## Done

- Embedding cache (#12) — PR #28: KV + 7d TTL, hit/miss logging.
- Batch chunk insertion (#13) — PR #28: D1 batch API in `document-store.ts`.
- AI Gateway config (#16) — PR #28: `USE_AI_GATEWAY` + `AI_GATEWAY_ID` toggle.
- Workflow timeouts (#14) — 30s per embedding batch via `withTimeout()`.
- Workflow idempotency (#15) — deterministic IDs + upsert SQL.

## Next

- D1 query optimizations (#17): composite indexes, PRAGMA optimize.
- Retrieval quality backlog: BGE-Large (#20), reranking agent tool (#21).

## Links

- Historical detail: `../archive/PERFORMANCE_OPTIMIZATION.md`
- Related issues: #12–#17, #20, #21
