# Status: Now & Next
- **Last Updated**: 2026-08-08
- **Owner**: Project Maintainer

## Now
- Phase 1 docs pivot **merged** (PR #31): spec, ADR, roadmap, disposition audit, cutover runbook.
- Rework cutover **landed** on this branch (`chore/30-rework-cutover`): archived `production-readiness.md`, deleted dead `QueryInterface.tsx`.
- Prior hardening remains shipped: security (PRs #22/#23), perf (#28), observability phase 1 (#29).

## Next
- Merge cutover PR, then open phase branches in order (no feature work until cutover is on `main`).
- **Phase 0 (#32): model refresh** — replace deprecated `@cf/meta/llama-3.1-8b-instruct` (listed expiry 2026-05-30). Blocks Phase 3.
- Phase 2 (#33): curated corpus + static corpus browser + glossary example-prompt injection (Landing “Coming Soon” copy first).
- Phase 3 (#34): Agents SDK RAG agent with transparent step/trace UI + first `durable_objects` bindings.
- Phase 4 (#35): eval reporting surface. Phase 5 (#36): red-team demo mode.
- Deprioritized vs reimagining: OTLP dashboards (#18).
- **Coupled to Phase 5**: privacy endpoints (#19) — red-team mode increases retained prompt text in chat logs.

## Risks/Watch
- **Deprecated generation model in production today** — resolve via Phase 0 (#32) before agent work begins.
- **Red-team prompts will land in chat logs** — `CHAT_LOGGING_ENABLED: true`; tag or exclude red-team sessions; see #19.
- Durable Objects not yet configured — Phase 3 needs bindings + `new_sqlite_classes` migration.
- Escape hatch: evaluate runbook criteria 1–8 at each phase start/merge (`docs/runbooks/rework-branch-cutover.md`).
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
- Prior PRs: #22, #23, #28, #29, #31
