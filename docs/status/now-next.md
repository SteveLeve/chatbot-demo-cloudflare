# Status: Now & Next

- **Last Updated**: 2026-08-09
- **Owner**: Project Maintainer

## Now

- Phase 3 Agents SDK / trace UI **merged** (PR #41 / #34).
- Code quality automation Phases 1–3 **merged** (PR #42 / #40): ESLint, Prettier, Husky+lint-staged, CI.
- **Follow-up (#40)**: pin CI to Node 24 so `npm ci` matches the npm 11 lockfile. Ruleset stays **advisory** until CI is reliably green, then enforce.
- Prior hardening remains shipped: security (PRs #22/#23), perf (#28), observability phase 1 (#29); model refresh (#38), corpus (#39).

## Next

- Close out #40 post-merge CI fix, then open phase branches in order:
  - Phase 4 (#35): eval reporting. Phase 5 (#36): red-team demo mode.
- Deprioritized vs reimagining: OTLP dashboards (#18).
- **Coupled to Phase 5**: privacy endpoints (#19).

## Risks/Watch

- Escape hatch: evaluate runbook criteria 1–8 at each phase start/merge (`docs/runbooks/rework-branch-cutover.md`). Cutover gate: **passed**.
- Durable Objects configured in Phase 3 (#34) — `RAGAgent` SQLite-backed DO + trace panel.
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
- Prior PRs: #22, #23, #28, #29, #31, #37, #38
