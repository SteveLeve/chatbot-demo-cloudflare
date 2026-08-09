# Status: Documentation & Code Disposition Audit (Agentic RAG Pivot, Epic #30)
- **Last Updated**: 2026-08-08 (cutover executed)
- **Owner**: Project Maintainer

> **Purpose.** Before any rework implementation code lands, this table records what every doc and every
> RAG-pattern-adjacent code file *should become* — so nothing stale survives un-flagged once the rework
> starts, and a future contributor (human or AI agent) can check a file's disposition here instead of
> guessing from stale prose. This is a checklist variant of the `status-now-next` template: instead of
> "now/next," each row states current classification, target disposition, and when that disposition
> executes. Execution procedure: [`../runbooks/rework-branch-cutover.md`](../runbooks/rework-branch-cutover.md).
> This doc self-obsoletes once the rework (Phases 0-5, #32-#36) completes — archive it then.
>
> **Cross-checked** against a parallel strategy plan (`.cursor/plans/greenfield_agentic_rewrite_2ce53f3e.plan.md`)
> which independently converged on the same in-place/purge-first → hybrid escape-hatch shape. That pass
> surfaced surfaces this table had missed on the first draft (`package.json` description, `LandingPage.tsx`
> stale copy, the `TechStackFooter`/`TECH_STACK` UI narrative, the `/api/v1/docs` self-documentation route,
> and a stale model reference inside `docs/skills/workers-ai-specialist/SKILL.md`) — folded in below. It also
> referenced `.agents/skills/*`, which **does not exist in this repo** (that path is from a sibling project
> in the same workspace) — noted so nobody chases a phantom path during cutover.

## Legend
- **Classification**: `NEW` (already pivot-aligned) · `TRANSITIONAL` (hedged with a pivot banner, body still pre-pivot) · `OLD` (no pivot awareness) · `NEUTRAL` (process/infra doc, architecture-independent) · `ARCHIVED` (already historical)
- **Disposition**: `keep` · `banner-added` · `rewrite` · `update` · `archive` · `delete` · `replace`
- **Executes**: `NOW` (this PR, #31) · `cutover` (`chore/30-rework-cutover`, no new implementation) · `Phase N (#3x)` (a specific rework phase branch)

## Docs

| Path | Classification | Disposition | Executes | Notes |
|---|---|---|---|---|
| `README.md` | TRANSITIONAL | keep | — | "Direction (Epic #30)" section already split from "Current Features" |
| `AGENTS.md` | NEUTRAL | keep | — | Pointer to `docs/AGENTS.md` |
| `.github/copilot-instructions.md` | OLD → rewritten | rewrite | NOW | Highest-leverage poisoning risk (AI-agent ground truth); rewritten this PR |
| `package.json` (`description` field) | OLD → rewritten | rewrite | NOW | One-line portfolio description named the pre-pivot concept only; fixed this PR |
| `data/wikipedia/README.md` | OLD | replace | Phase 2 (#33) | Superseded by `data/corpus/` curated-set docs |
| `docs/README.md` | NEW | keep | — | Docs hub, already links spec/ADR/roadmap/epic |
| `docs/AGENTS.md` | NEUTRAL | keep | — | Doc-type taxonomy this audit follows |
| `docs/ARCHITECTURE.md` | TRANSITIONAL | update | Phase 3 (#34) | Top banner + Direction section already NEW; body (components/data flow) still describes current pipeline |
| `docs/DEPLOYMENT.md` | OLD → banner-added | update | Phase 3 (#34) | Deploy mechanics (`npm run deploy`) stay valid; amend when DO bindings/migrations land |
| `docs/QUICKSTART.md` | OLD → banner-added | rewrite | Phase 2/3 (#33/#34) | Steps 1-8 (corpus fetch, resource names, ingest) will not exist post-rework; "What's Next" tail already correct |
| `docs/guides/setup.md` | TRANSITIONAL | update | Phase 2/3 (#33/#34) | Top banner + "What's Next" correct; "What's Built" body still describes current components as current |
| `docs/spec/README.md` | NEUTRAL | keep | — | Index |
| `docs/spec/spec-agentic-rag-portfolio.md` | NEW | keep | — | Governing spec |
| `docs/decisions/README.md` | NEUTRAL | keep | — | ADR index |
| `docs/decisions/adr-20260807-agents-sdk-runtime.md` | NEW | keep | — | Governing ADR |
| `docs/decisions/adr-20260206-security-hardening.md` | NEUTRAL | keep | — | Orthogonal to RAG architecture, still valid |
| `docs/roadmaps/agentic-rag.md` | NEW | keep | — | Phase roadmap with dependency graph |
| `docs/roadmaps/observability.md` | NEUTRAL | keep | — | Cross-cutting, links `docs/archive/` detail |
| `docs/roadmaps/performance.md` | NEUTRAL | keep | — | Cross-cutting |
| `docs/roadmaps/compliance.md` | NEUTRAL | keep | — | Coupled to Phase 5 (#36) per `now-next.md`, content itself unaffected |
| `docs/status/now-next.md` | NEW | keep | — | Living current-state doc |
| `docs/archive/production-readiness.md` | ARCHIVED | keep | done (cutover) | Moved from `docs/status/` in `chore/30-rework-cutover`; disclaimer header added |
| `docs/status/security.md` | NEUTRAL | keep | — | Security posture, architecture-independent |
| `docs/status/doc-audit-agentic-rag.md` | NEW | keep | — | This file |
| `docs/runbooks/cloudflare-deploy.md` | NEUTRAL | keep | — | Mechanics unaffected by pivot |
| `docs/runbooks/cloudflare-dev.md` | NEUTRAL | keep | — | Mechanics unaffected by pivot |
| `docs/runbooks/observability-setup.md` | NEUTRAL | keep | — | trace/logger infra explicitly reused |
| `docs/runbooks/security-salt-rotation.md` | NEUTRAL | keep | — | Unaffected by pivot |
| `docs/runbooks/rework-branch-cutover.md` | NEW | keep | — | This audit's companion runbook |
| `docs/templates/*` (4 files) | NEUTRAL | keep | — | Pure scaffolding |
| `docs/skills/workers-ai-specialist/SKILL.md` | NEW | keep | done (Phase 0 / #32) | Updated to Llama 4 Scout + `src/config/models.ts` |
| `docs/skills/*` (other 5 files) | NEUTRAL | keep | — | Agent specialist playbooks, architecture-independent |
| `docs/archive/*` (8 files, incl. `production-readiness.md`) | ARCHIVED | keep | — | Already historical; `CLAUDE.generated.md` has a disclaimer but stale body — lowest priority, no action needed while archived |

## Code

| Path | Classification | Disposition | Executes | Notes |
|---|---|---|---|---|
| `src/patterns/basic-rag.ts` | OLD | keep (comparison) | — | Legacy path at `/api/v1/query`; primary demo is `RAGAgent` (#34) |
| `src/agents/rag-agent.ts` | NEW | keep | done (#34) | Agents SDK agent with retrieve tool + trace state |
| `src/utils/retrieval.ts` | NEW | keep | done (#34) | Shared corpus retrieval |
| `src/ai/workers-ai.ts` | NEW | keep | done (#34) | `workers-ai-provider` adapter |
| `src/types/trace.ts` | NEW | keep | done (#34) | Trace event types |
| `ui/src/pages/AgentChatPage.tsx` | NEW | keep | done (#34) | Agent demo + trace panel |
| `ui/src/components/TracePanel.tsx` | NEW | keep | done (#34) | Step trace UI |
| `src/ingestion-workflow.ts` | TRANSITIONAL | update | done (Phase 2 / #33) | Stable corpus ids via ingest; curated corpus path `data/corpus/` |
| `src/utils/document-store.ts` | NEUTRAL | keep | — | `getArticle` used by `GET /api/v1/corpus/:id`; further reshape in Phase 3 |
| `src/utils/chunking.ts` | NEUTRAL | keep | — | Works for curated corpus sizes; no bulk assumptions changed |
| `src/utils/embedding-cache.ts` | NEUTRAL | keep | — | Embedding model unchanged (BGE base); cache keys remain valid. Revisit if #20 upgrades embeddings |
| `src/types/index.ts` (`pattern` union, ~line 169) | TRANSITIONAL | updated | #34 | Union trimmed to `'basic' \| 'agentic'` |
| `src/index.ts` (route wiring) | TRANSITIONAL | updated | #34 | Agent routes + bootstrap; eval/red-team remain |
| `wrangler.jsonc` (bindings) | TRANSITIONAL | updated | #34 | `RAG_AGENT` DO + `v1-rag-agent` migration |
| `migrations/0001_create_documents_table.sql`, `0002_create_chunks_table.sql`, `0003_create_fts_table.sql` | OLD | replace | Phase 2/3 (#33/#34) | Bulk-corpus schema; `0003` comment names the retired reranking/hybrid-search taxonomy |
| `data/wikipedia/README.md`, `scripts/fetch-wikipedia.py` | OLD | keep | — | Legacy bulk fetch; curated workflow uses `data/corpus/` |
| `scripts/ingest-wikipedia.js`, `scripts/build-corpus.js` | NEW | keep | done (#33) | Curated ingest; manifest builder |
| `data/corpus/*` | NEW | keep | done (#33) | ~37 committed articles |
| `ui/src/pages/CorpusPage.tsx`, `ui/src/content/corpus-manifest.json` | NEW | keep | done (#33) | Static corpus browser |
| `ui/src/pages/BasicChatPage.tsx` | TRANSITIONAL | update | Phase 3 (#34) | `?q=` prompt injection added; trace panel lands in #34 |
| `ui/src/content/{glossary-data,faq-data,sidebar-sections}.ts` | NEW | keep | done (#33) | Glossary `examplePrompts[]` shipped |
| `ui/src/components/QueryInterface.tsx` | — | delete | done (cutover) | Removed in `chore/30-rework-cutover` (was unreferenced dead code) |
| `src/index.ts:513` (`GET /api/v1/docs` self-documentation) | TRANSITIONAL | updated | #34 | Documents `basic` + `agentic` patterns |
| `ui/src/pages/LandingPage.tsx` | NEW | keep | done (#33) | Corpus browser card; agentic roadmap copy replaces stale "Advanced RAG" |
| `ui/src/content/glossary-data.ts` | NEW | keep | done (#33) | `examplePrompts[]` + chat injection via `?q=` |
| `ui/src/pages/GlossaryPage.tsx` | NEW | keep | done (#33) | Renders example prompt links to chat |
| `ui/src/components/sidebar/TechStackFooter.tsx` + `TECH_STACK` consts (`BasicChatPage.tsx`, `FaqPage.tsx`, `GlossaryPage.tsx`) | NEUTRAL shell / minor-stale copy | update | Phase 3 (#34) | Component itself is presentational (props-driven, reusable as-is); the `TECH_STACK.technologies`/`description` literals list current stack only — not misleading, just incomplete once Agents SDK/DO ship |
| `src/utils/{trace,logger,chat-logger,privacy,rate-limiter,security,validation,metadata}.ts` | NEUTRAL | keep | — | Cross-cutting infra reused as-is; spec mandates reusing `trace.ts`/`logger.ts` for the trace panel |
| `migrations/0004_add_chat_logging.sql` | NEUTRAL | keep | — | Extended (tag/exclude red-team sessions), not replaced |
| `ui/src/pages/{FaqPage,GlossaryPage}.tsx` | NEW | keep | done (#33) | Glossary prompt injection |

## Risks/Watch
- If a `Phase N` code row's replacement is delayed past its target phase, the corresponding doc rows above it stay `TRANSITIONAL`/banner-only longer than intended — re-check this table when a phase issue (#32-#36) closes.
- `docs/archive/CLAUDE.generated.md` is disclaimed but not corrected; if it ever becomes a live onboarding reference again, escalate to `rewrite`.
- `ui/src/pages/LandingPage.tsx` stale copy resolved in Phase 2 (#33).
- If evolve-in-place trips the escape-hatch criteria mid-phase, this table becomes the hybrid **port allowlist inverted**: every `keep`/NEUTRAL row is a port candidate, every `replace`/`delete` row is rebuilt fresh. See the runbook's Tier 2/3 sections.

## References
- Epic: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/30
- Spec: `docs/spec/spec-agentic-rag-portfolio.md`
- Roadmap: `docs/roadmaps/agentic-rag.md`
- Cutover procedure: `docs/runbooks/rework-branch-cutover.md`
