# ADR: Cloudflare Agents SDK as Agentic Runtime

- **Date**: 2026-08-07
- **Status**: Accepted
- **Owners**: Project Maintainer
- **Related Issues/PRs**: #30

## Context

This portfolio demo originally emphasized a split between hand-crafted RAG and framework-built RAG. That positioning no longer differentiates: third-party frameworks and vendor agent offerings proliferate, while Cloudflare’s platform now provides first-party primitives for agents (Agents SDK on Durable Objects), inference (Workers AI), retrieval (Vectorize), storage (D1/R2), and durable work (Workflows).

We need a durable decision for the **agentic runtime** so subsequent implementation PRs stay coherent: Cloudflare-first, transparent, and free of ad-hoc agent frameworks.

## Decision

- Use the **Cloudflare Agents SDK** (Durable Objects–backed agents) as the primary agentic runtime for the reimagined demo.
- Keep the existing **Hono Worker** as the HTTP/API and static-assets shell.
- Retain **Workers AI**, **Vectorize**, **D1**, **R2**, **KV**, and **Workflows** for inference, retrieval, persistence, cache, and ingestion.
- Do **not** adopt LangChain agents, LlamaIndex agents, or external vendor agent platforms as the orchestration layer.
- **Do** permit the Vercel AI SDK together with `workers-ai-provider` as the model-invocation and tool-calling layer _when used inside an Agents SDK Durable Object_. This is Cloudflare's documented and recommended pattern for Agents SDK model calls, and `AIChatAgent` depends on it; banning it would mean rejecting the platform-native path this ADR selects.

### The boundary

Orchestration, state, and durability come from Cloudflare primitives (Agents SDK, Durable Objects, Workflows). Third-party libraries are permitted only as **thin, swappable adapters** confined to a single module:

| Concern                                           | Source                                                | Rationale                                |
| ------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Agent loop, session state, scheduling, durability | Agents SDK / Durable Objects                          | The decision                             |
| Model invocation, tool-call plumbing, streaming   | AI SDK + `workers-ai-provider` (or `env.AI` directly) | Cloudflare-recommended; adapter-confined |
| Text splitting                                    | `@langchain/textsplitters`                            | Pre-existing narrow utility              |
| Retrieval, storage, inference, ingestion          | Vectorize / D1 / R2 / KV / Workers AI / Workflows     | Platform                                 |

A dependency that wants to own the _loop_ is out. A dependency that formats a model request is in, provided it lives behind one adapter module.

## Consequences

- **Positive**: Portfolio narrative matches platform skill; single-vendor edge stack; DO state/session fits multi-step agent demos; aligns with Cloudflare docs and hiring signal.
- **Negative/Risks**: Agents SDK API surface may evolve; DO semantics require careful testing; migration path from `src/patterns/basic-rag.ts` must be phased.
- **Negative/Risks**: The AI SDK allowance is a deliberate, documented exception to the "Cloudflare-first" rule. It must stay confined to one adapter module so the agent loop remains platform-owned and the dependency stays swappable for direct `env.AI` calls.
- **Negative/Risks**: Agents SDK requires Durable Objects. **Resolved in Phase 3 (#34):** `RAG_AGENT` binding + `v1-rag-agent` migration in `wrangler.jsonc`. On the Workers Free plan only SQLite-backed DOs are available, with daily caps (100k requests, 5M row reads) that apply to a public demo.
- **Follow-ups**: Phase 0 model refresh (current generation model is deprecated — see spec); implement Phases 2–5 on #30 (corpus browser, agent+trace, eval, red-team); update architecture docs when the agent path ships.

## Alternatives Considered

- **Hand-rolled Worker tool loop (no Agents SDK)** — Rejected as primary showcase: workable, but underrepresents Cloudflare’s agentic product surface for a portfolio piece whose goal is platform agentic fluency.
- **LangChain / LlamaIndex agent frameworks** — Rejected: they want to own the agent loop, which conflicts with the “no ad-hoc framework” north star and dilutes Cloudflare-first positioning. Note this rejects the _agent_ abstractions, not model-provider adapters — see the boundary table above.
- **External vendor agent platforms** — Rejected: off-platform orchestration undermines the edge architecture story.
- **Banning the AI SDK outright and calling `env.AI.run` directly** — Rejected: it re-introduces the hand-crafted-vs-framework framing this reimagining retires, and diverges from Cloudflare's own documented Agents SDK patterns. Direct `env.AI` calls remain available behind the same adapter if the dependency ever becomes a liability.

## References

- Epic: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/30
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Agents SDK model guidance: https://developers.cloudflare.com/agents/api-reference/using-ai-models/
- Durable Objects pricing & free-plan limits: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Workers AI model catalog (deprecation status): https://developers.cloudflare.com/workers-ai/models/
- Current single-turn RAG: `src/patterns/basic-rag.ts`
