# Runbook: Agentic RAG Rework — Branch Cutover & Escape Hatch
- **Last Updated**: 2026-08-08
- **Owner**: Project Maintainer
- **Prereqs**: PR #31 (docs pivot, `docs/agentic-rag-reimagine`) merged to `main`; familiarity with
  [`../status/doc-audit-agentic-rag.md`](../status/doc-audit-agentic-rag.md) and
  [`../spec/spec-agentic-rag-portfolio.md`](../spec/spec-agentic-rag-portfolio.md).

## When to Run

Once per pivot, immediately after PR #31 merges — before any Phase 0-5 (#32-#36) implementation branch
opens. This is what prevents `main` from ever holding unflagged-stale content alongside in-progress
agent code.

## Steps

### 1. Cutover branch (no new implementation code)

1. Branch `chore/30-rework-cutover` off updated `main`.
2. Execute every row in [`../status/doc-audit-agentic-rag.md`](../status/doc-audit-agentic-rag.md) tagged
   `Executes: cutover`:
   - Archive `docs/status/production-readiness.md` into `docs/archive/`, using the same disclaimer-header
     pattern as `docs/archive/CLAUDE.generated.md` (banner explaining what it was, when, and where the
     current source of truth lives).
   - Delete `ui/src/components/QueryInterface.tsx` (confirmed dead code, unreferenced).
3. Update the audit table's rows just executed, and log the cutover in `docs/status/now-next.md`.
4. Open a PR, merge to `main` standalone. **Do not combine this with the first phase branch** — keeping
   it separate is what makes the cutover verifiable in isolation.

### 2. Per-phase branches

Open sequentially from updated `main`, each its own reviewable PR, in roadmap order:

```
feat/32-model-refresh → feat/33-corpus-glossary → feat/34-agent-do-trace →
feat/35-eval-reporting → feat/36-redteam-mode
```

Before starting each phase branch, re-read the audit table's rows tagged for that phase — those are the
docs/code files this branch is responsible for moving from `TRANSITIONAL`/`OLD` to `keep`.

### 3. Evaluate escape-hatch criteria continuously

At the start of each phase branch and again before merging it, check the criteria below. Any single one
being true means **stop and invoke the hybrid escape hatch** (§4) instead of continuing evolve-in-place.

| # | Criterion | How to check |
|---|---|---|
| 1 | Reuse-util signature break | `git diff --stat main...<phase-branch>` shows *removed/changed* (not only added) exports in any of `trace.ts`, `logger.ts`, `chat-logger.ts`, `privacy.ts`, `rate-limiter.ts`, `security.ts`, `validation.ts`, `metadata.ts` |
| 2 | Destructive migration | New migration file contains `DROP TABLE` / `ALTER TABLE ... DROP COLUMN` touching tables `chat-logger.ts` depends on (from `migrations/0004_add_chat_logging.sql`), rather than being purely additive |
| 3 | Time-box breach | No PR merged to `main` within 14 calendar days of `chore/30-rework-cutover` opening; or `feat/34-agent-do-trace` open >21 days without passing CI and a working demo route |
| 4 | Reused test breakage | `npm test` requires *modifying* (not just adding alongside) any existing passing test under trace/logger/chat-logger/security/rate-limiter coverage |
| 5 | UI structural coupling | Removing `basic-rag.ts`/`BasicChatPage.tsx` forces structural rewrites (not additive prop changes) to `SourcesCard`, `ChatInput`, `MessageBubble`, `DemoLayout`, or sidebar components |
| 6 | Binding/plan conflict | A dry-run `wrangler deploy` shows binding errors combining existing D1/KV/Vectorize bindings with new `durable_objects`/`new_sqlite_classes` migrations |

### 4. Hybrid escape hatch (only if §3 trips)

1. Confirm with the user before creating anything — default location is a **sibling repo**
   (e.g. `chatbot-demo-cloudflare-agentic`), not a subfolder of this repo and not a from-scratch blank
   slate.
2. **Port verbatim** (preserve history via `git subtree split` / `git filter-repo` where feasible): every
   row in the audit table's Code section marked `disposition: keep`, plus
   `docs/decisions/adr-20260206-security-hardening.md`, `docs/runbooks/security-salt-rotation.md`,
   `docs/status/security.md`, and the `docs/AGENTS.md` conventions/templates.
3. **Do not port** — rebuild fresh from the spec: every row marked `disposition: replace` or `delete`.
4. **Close the loop on this repo**: update `docs/README.md` and root `README.md` to point at the new
   repo, and archive the superseded app code here. Skipping this step recreates the exact "stale doc
   misleads a future agent" problem this whole audit exists to prevent — just in a second repo.

## Validation

- After step 1: `git diff main...HEAD --stat` on the cutover PR touches only the archived file's old/new
  path and the deleted component — no other files.
- After each phase branch: the audit table's rows for that phase read `keep`/`banner-added` with no
  stale `Executes` value left pointing at a merged phase.
- `grep -rniE "phase 2|coming soon|reranking|refinement" --include=*.md docs README.md .github | grep -v "^docs/archive"`
  returns no new unflagged hits after each merge.

## Rollback

Each step above is a normal PR — revert via `git revert` on the merge commit if a cutover or phase branch
introduces a regression. The escape hatch (§4) has no rollback once the sibling repo is created and
adopted as canonical; treat that decision as the point of no return and confirm with the user first.

## Notes
- Companion audit table: [`../status/doc-audit-agentic-rag.md`](../status/doc-audit-agentic-rag.md)
- Epic: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/30
- Phase issues: #32, #33, #34, #35, #36
