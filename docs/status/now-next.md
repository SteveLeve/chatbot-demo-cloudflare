# Status: Now & Next

- **Last Updated**: 2026-08-19
- **Owner**: Project Maintainer

## Now

- **#17 D1 query optimizations implemented** — skip unused JSON.parse on retrieval hydrate, `idx_chat_messages_session_created`, `PRAGMA optimize` in the daily cron, batched `message_chunks` inserts. Apply `migrations/0006_chat_messages_session_created.sql` remotely before deploy (`npm run db:migrate:remote`).
- **#20 prep implemented (no index recreation)** — live eval Hit@K now scores corpus slugs (`articleId`) instead of D1 `doc-*` ids; KV embedding keys are `emb:{model}:{hash}` so a later BGE-Large swap cannot mix dimensions. Actual 1024-d cutover remains gated.
- **#21 reranker implemented** — `@cf/baai/bge-reranker-base` runs inside `retrieve_from_corpus` (candidateK=10, keep=`topK`). Frozen basic-rag / eval / red-team `/try` stay vector-only.

## Next

- **#20 decision gate:** after deploy, run a live eval snapshot (article ids now match). Cut over to BGE-Large only if the educational story is “show an embedding-model migration”; otherwise leave #20 P4 / close as not justified at ~37-article demo scale. Do not build a long-lived dual-index A/B unless that follow-up is approved.
- Publish privacy policy page and consent flow (follow-on to #19).
- **#50** — remove legacy Basic RAG path, converge demo naming on "RAG Demo" (follow-up from PR #49 review).
- **#54** — remaining major dependency bumps if any; see issue.
- Deprioritized vs reimagining: OTLP dashboards (#18).

## Recently closed

- Epic #30 (Cloudflare-first agentic RAG reimagine) — all 5 phases merged to `main`.
- Code quality automation (#40); dependency housekeeping (Dependabot + #54 for leftover majors).
- #12, #13 — perf shipped in PR #28 (embedding cache, batch inserts).
- #14, #15 — ingestion workflow timeouts + idempotent step IDs.
- #19 — privacy export / delete / opt-out endpoints.
- #26, #27 — security test coverage gaps.

## Risks/Watch

- Escape hatch: evaluate runbook criteria 1–8 at each phase start/merge (`docs/runbooks/rework-branch-cutover.md`). Cutover gate: **passed**.
- Durable Objects configured in Phase 3 (#34) — `RAGAgent` SQLite-backed DO + trace panel.
- Eval must stay labeled **demo-scale**; never overclaim on small gold set. Live Hit@K is now internally consistent but still not a model leaderboard.
- Red-team surface must stay curated + educational — no freeform attack tooling. Live `/try` does not use the reranker.
- Rate limiting false positives during peak demo traffic — monitor logs.
- Ingest rate limit is 10/min vs 37 corpus articles — any later #20 re-ingest must pace the client.

## References

- Epic: #30 — sub-issues #32 (Phase 0), #33 (Phase 2), #34 (Phase 3), #35 (Phase 4), #36 (Phase 5)
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- ADR: `docs/decisions/adr-20260807-agents-sdk-runtime.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Doc/code disposition audit: `docs/status/doc-audit-agentic-rag.md`
- Rework cutover runbook: `docs/runbooks/rework-branch-cutover.md`
- Prior issues: #17 (D1), #18 (observability), #19 (compliance), #20/#21 (model & reranking), #6–#11 (security), #50 (basic-rag removal/rename), #54 (deferred major dependency bumps)
- Code quality guide: `docs/guides/code-quality-automation.md`
- Prior PRs: #22, #23, #28, #29, #31, #37, #38, #41, #45, #46, #49
