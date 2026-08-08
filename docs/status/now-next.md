# Status: Now & Next
- **Last Updated**: 2026-08-07
- **Owner**: Project Maintainer

## Now
- Portfolio reimagining kicked off: Cloudflare-first **agentic RAG** with Agents SDK, eval reporting, and red-team concepts (epic #30).
- Phase 1 in flight: vision/spec/ADR/docs reframe (`docs/spec/spec-agentic-rag-portfolio.md`, `docs/decisions/adr-20260807-agents-sdk-runtime.md`).
- Prior hardening remains shipped: security (PRs #22/#23), perf (#28), observability phase 1 (#29).

## Next
- Phase 2: corpus browser + glossary example-prompt injection (#30).
- Phase 3: Agents SDK RAG agent with transparent step/trace UI (#30).
- Phase 4–5: eval reporting surface, then red-team demo mode (#30).
- Backlog (lower priority vs reimagining): OTLP dashboards (#18), privacy endpoints (#19).

## Risks/Watch
- Agents SDK API churn — pin ADR and cite official docs when implementing Phase 3.
- Scope creep into unbounded corpus or third-party agent frameworks — enforce #30 non-goals.
- Rate limiting false positives during peak demo traffic — monitor logs.

## References
- Epic: #30
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- ADR: `docs/decisions/adr-20260807-agents-sdk-runtime.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Prior issues: #18 (observability), #19 (compliance), #6–#11 (security)
- Prior PRs: #22, #23, #28, #29
