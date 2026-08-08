# Status: Now & Next
- **Last Updated**: 2026-08-07
- **Owner**: Project Maintainer

## Now
- Portfolio reimagining kicked off: Cloudflare-first **agentic RAG** with Agents SDK, eval reporting, and red-team concepts (epic #30).
- Phase 1 in flight: vision/spec/ADR/docs reframe (`docs/spec/spec-agentic-rag-portfolio.md`, `docs/decisions/adr-20260807-agents-sdk-runtime.md`).
- Prior hardening remains shipped: security (PRs #22/#23), perf (#28), observability phase 1 (#29).

## Next
- **Phase 0 (#32): model refresh** — the current generation model `@cf/meta/llama-3.1-8b-instruct` is deprecated (listed expiry 2026-05-30, already past). Blocks Phase 3, which needs a function-calling model.
- Phase 2 (#33): curated corpus + static corpus browser + glossary example-prompt injection.
- Phase 3 (#34): Agents SDK RAG agent with transparent step/trace UI. Also adds the first `durable_objects` bindings + `migrations` to `wrangler.jsonc`.
- Phase 4 (#35): eval reporting surface. Phase 5 (#36): red-team demo mode.
- Deprioritized vs reimagining: OTLP dashboards (#18).
- **Not simply deprioritized**: privacy endpoints (#19) are now *coupled to Phase 5* — red-team mode drives more user-supplied prompt text into the chat log, so #19 must be revisited before #36 ships.

## Risks/Watch
- **Deprecated generation model in production today** — resolve via Phase 0 (#32) before agent work begins.
- **Red-team prompts will land in chat logs** — `CHAT_LOGGING_ENABLED: true`; `src/utils/chat-logger.ts` writes prompts + hashed IPs to D1. Tag or exclude red-team sessions; see #19.
- Durable Objects not yet configured — Phase 3 needs bindings + `new_sqlite_classes` migration. Free plan allows SQLite-backed DOs only (100k req/day).
- Agents SDK API churn — pin ADR and cite official docs when implementing Phase 3.
- Scope creep into unbounded corpus or third-party agent *orchestration* frameworks — enforce #30 non-goals. (The AI SDK is permitted as an adapter-confined model/tool layer; see the ADR boundary table.)
- Rate limiting false positives during peak demo traffic — monitor logs.

## References
- Epic: #30 — sub-issues #32 (Phase 0), #33 (Phase 2), #34 (Phase 3), #35 (Phase 4), #36 (Phase 5)
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- ADR: `docs/decisions/adr-20260807-agents-sdk-runtime.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Prior issues: #18 (observability), #19 (compliance), #20/#21 (model & reranking — reconcile with #32), #6–#11 (security)
- Prior PRs: #22, #23, #28, #29
