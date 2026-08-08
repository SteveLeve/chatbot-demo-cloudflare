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
- Do **not** adopt LangChain agents, LlamaIndex agents, Vercel AI SDK agent loops, or other vendor agent platforms as the core orchestration layer.
- Limit third-party AI libraries to narrowly scoped utilities only when necessary (today: text splitting); prefer platform APIs for the agent loop, tools, and streaming.

## Consequences

- **Positive**: Portfolio narrative matches platform skill; single-vendor edge stack; DO state/session fits multi-step agent demos; aligns with Cloudflare docs and hiring signal.
- **Negative/Risks**: Agents SDK API surface may evolve; DO semantics require careful testing; migration path from `src/patterns/basic-rag.ts` must be phased.
- **Follow-ups**: Implement Phases 2–5 on #30 (corpus browser, agent+trace, eval, red-team); update architecture docs when the agent path ships.

## Alternatives Considered

- **Hand-rolled Worker tool loop (no Agents SDK)** — Rejected as primary showcase: workable, but underrepresents Cloudflare’s agentic product surface for a portfolio piece whose goal is platform agentic fluency.
- **LangChain / LlamaIndex / similar frameworks** — Rejected: conflicts with “no ad-hoc framework” north star and dilutes Cloudflare-first positioning.
- **External vendor agent platforms** — Rejected: off-platform orchestration undermines the edge architecture story.

## References

- Epic: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/30
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Current single-turn RAG: `src/patterns/basic-rag.ts`
