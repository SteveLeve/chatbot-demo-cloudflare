# Status: Now & Next

- **Last Updated**: 2026-09-07
- **Owner**: Project Maintainer

## Now

- **Curated `ingest:corpus`** — production D1 `article_id` is still UUID from the old Wikipedia dump; `GET /api/v1/corpus/:slug` 404s. Needed before gold-set slugs match without title mapping.
- **Agent kebab / tool-loop** — SPA `useAgent({ agent: 'RAGAgent' })` kebab-cases to `/agents/r-a-g-agent` (404). Live DO route is `/agents/rag-agent`. Retrieve execute (and #21 rerank traces) did not run (`finishReason: tool-calls`, 5 empty steps).

## Next

- Publish privacy policy page and consent flow (follow-on to #19).
- **#50** — remove legacy Basic RAG path, converge demo naming on "RAG Demo" (follow-up from PR #49 review).
- **#54** — remaining major dependency bumps if any; see issue.
- Deprioritized vs reimagining: OTLP dashboards (#18).

## Recently closed

- **`ingest:corpus` rate-limit pacing** — client script now respects the 10/min ingest limit (sliding-window throttle), retries 429/5xx with backoff, and skips `curated-list.json`. Verified: 37/37 articles, ~4 min.
- **Eval `/run` hardening** — prod `POST /api/v1/eval/run` was zeroing all cases with `"error code: 522"` because the coordinator self-fetched its custom domain (Cloudflare-documented 522 on same-hostname fetch). Fixed with a `SELF` service binding fan-out (`src/eval/fan-out.ts`), hardened child response parsing, and prod smoke test (**24/24 pass**, ~20s). Prior pieces already shipped: batch fan-out for the 50-subrequest cap, `extractModelText()` for judge responses, retrieval ids preserved on generate/judge failure.
- **#20 BGE-Large embedding upgrade** — closed as not planned (2026-08-20). Live title-mapped Hit@K was **18/18** (mean retrieval 0.958) on `bge-base-en-v1.5`; a 1024-d Vectorize recreate is not justified at ~37-article demo scale. Cache keys remain `emb:{model}:{hash}` if a future swap is ever revived. #21 reranker is the retrieval-quality path that does not recreate the index. Decision: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/20#issuecomment-5360779635
- **#17 D1 query optimizations** — skip unused JSON.parse on retrieval hydrate, `idx_chat_messages_session_created`, `PRAGMA optimize` in the daily cron, batched `message_chunks` inserts.
- **#21 reranker** — `@cf/baai/bge-reranker-base` inside `retrieve_from_corpus` (candidateK=10, keep=`topK`). Frozen basic-rag / eval / red-team `/try` stay vector-only. Agent traces for rerank still need the tool-loop fix above.
- Epic #30 (Cloudflare-first agentic RAG reimagine) — all 5 phases merged to `main`.
- Code quality automation (#40); dependency housekeeping (Dependabot + #54 for leftover majors).
- #12, #13 — perf shipped in PR #28 (embedding cache, batch inserts).
- #14, #15 — ingestion workflow timeouts + idempotent step IDs.
- #19 — privacy export / delete / opt-out endpoints.
- #26, #27 — security test coverage gaps.

## Risks/Watch

- Escape hatch: evaluate runbook criteria 1–8 at each phase start/merge (`docs/runbooks/rework-branch-cutover.md`). Cutover gate: **passed**.
- Durable Objects configured in Phase 3 (#34) — `RAGAgent` SQLite-backed DO + trace panel.
- Eval must stay labeled **demo-scale**; never overclaim on small gold set. Live Hit@K is internally consistent only when `article_id` is a corpus slug (or title-mapped).
- Red-team surface must stay curated + educational — no freeform attack tooling. Live `/try` does not use the reranker.
- Rate limiting false positives during peak demo traffic — monitor logs.
- Workers Free **50 subrequests / invocation** — live eval must fan-out via `SELF` service binding; do not run 24 generate+judge cases in one request and do not self-fetch the custom domain (522).

## References

- Epic: #30 — sub-issues #32 (Phase 0), #33 (Phase 2), #34 (Phase 3), #35 (Phase 4), #36 (Phase 5)
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- ADR: `docs/decisions/adr-20260807-agents-sdk-runtime.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Doc/code disposition audit: `docs/status/doc-audit-agentic-rag.md`
- Rework cutover runbook: `docs/runbooks/rework-branch-cutover.md`
- Prior issues: #17 (D1), #18 (observability), #19 (compliance), #20 closed / #21 (reranking), #6–#11 (security), #50 (basic-rag removal/rename), #54 (deferred major dependency bumps)
- Code quality guide: `docs/guides/code-quality-automation.md`
- Prior PRs: #22, #23, #28, #29, #31, #37, #38, #41, #45, #46, #49, #87
