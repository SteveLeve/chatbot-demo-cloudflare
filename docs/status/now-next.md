# Status: Now & Next

- **Last Updated**: 2026-08-10
- **Owner**: Project Maintainer

## Now

- **Epic #30 (Cloudflare-first agentic RAG reimagine) complete** — all 5 phases merged to `main`.
- Phase 5 red-team demo mode **merged** (PR #46 / #36): curated scenarios, `GET /api/v1/redteam/scenarios` + optional `POST /try` by id, ChatLogger skip gate, `/docs/redteam` page, Playwright coverage.
- Phase 4 eval reporting **merged** (PR #45 / #35).
- Phase 3 Agents SDK / trace UI **merged** (PR #41 / #34).
- Code quality automation **complete** (#40): Phases 1–3 (PR #42), Node 24 CI pin (PR #43), `protect-main` requires `root` + `ui`.
- Prior hardening remains shipped: security (PRs #22/#23), perf (#28), observability phase 1 (#29); model refresh (#38), corpus (#39).

## Next

- Privacy endpoints (#19) remain **open** — Phase 5 ships logging exclusion only (red-team tries skip D1 chat logs). Full export / delete / opt-out still tracked on #19.
- Deprioritized vs reimagining: OTLP dashboards (#18).

## Risks/Watch

- Escape hatch: evaluate runbook criteria 1–8 at each phase start/merge (`docs/runbooks/rework-branch-cutover.md`). Cutover gate: **passed**.
- Durable Objects configured in Phase 3 (#34) — `RAGAgent` SQLite-backed DO + trace panel.
- Eval must stay labeled **demo-scale**; never overclaim on small gold set.
- Red-team surface must stay curated + educational — no freeform attack tooling.
- Scope creep into unbounded corpus or third-party agent orchestration frameworks — enforce #30 non-goals.
- Rate limiting false positives during peak demo traffic — monitor logs.

## References

- Epic: #30 — sub-issues #32 (Phase 0), #33 (Phase 2), #34 (Phase 3), #35 (Phase 4), #36 (Phase 5)
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- ADR: `docs/decisions/adr-20260807-agents-sdk-runtime.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Doc/code disposition audit: `docs/status/doc-audit-agentic-rag.md`
- Rework cutover runbook: `docs/runbooks/rework-branch-cutover.md`
- Prior issues: #18 (observability), #19 (compliance), #20/#21 (model & reranking — reconcile with #32), #6–#11 (security)
- Prior PRs: #22, #23, #28, #29, #31, #37, #38, #41, #45, #46
