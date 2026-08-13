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

### 3. Evaluate escape-hatch criteria continuously (Tier 1 → Tier 2 trigger)

At the start of each phase branch and again before merging it, check the criteria below. Any single one
being true means **stop and invoke the Tier 2 hybrid escape hatch** (§4) instead of continuing
evolve-in-place. Criteria 1-6 are mechanical (check via diff/test/deploy, not by feel); 7-8 are
process/qualitative signals — cross-referenced from a parallel strategy plan that independently converged
on this same escalation shape, and worth keeping because they catch what the mechanical checks can't
(agent confusion, whack-a-mole cleanup).

| #   | Criterion                  | How to check                                                                                                                                                                                                                  |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reuse-util signature break | `git diff --stat main...<phase-branch>` shows _removed/changed_ (not only added) exports in any of `trace.ts`, `logger.ts`, `chat-logger.ts`, `privacy.ts`, `rate-limiter.ts`, `security.ts`, `validation.ts`, `metadata.ts`  |
| 2   | Destructive migration      | New migration file contains `DROP TABLE` / `ALTER TABLE ... DROP COLUMN` touching tables `chat-logger.ts` depends on (from `migrations/0004_add_chat_logging.sql`), rather than being purely additive                         |
| 3   | Time-box breach            | No PR merged to `main` within 14 calendar days of `chore/30-rework-cutover` opening; or `feat/34-agent-do-trace` open >21 days without passing CI and a working demo route                                                    |
| 4   | Reused test breakage       | `npm test` requires _modifying_ (not just adding alongside) any existing passing test under trace/logger/chat-logger/security/rate-limiter coverage                                                                           |
| 5   | UI structural coupling     | Removing `basic-rag.ts`/`BasicChatPage.tsx` forces structural rewrites (not additive prop changes) to `SourcesCard`, `ChatInput`, `MessageBubble`, `DemoLayout`, or sidebar components                                        |
| 6   | Binding/plan conflict      | A dry-run `wrangler deploy` shows binding errors combining existing D1/KV/Vectorize bindings with new `durable_objects`/`new_sqlite_classes` migrations                                                                       |
| 7   | Purge churn                | A purge/cutover PR exceeds ~1 focused working session without reaching a clean gate pass (§ Validation) — whack-a-mole across skills/UI/docs instead of a bounded pass                                                        |
| 8   | Repeated stale citations   | An agent session (Claude, Cursor, Copilot, or a human contributor) cites a path or fact this audit marked `replace`/`delete`/`archive` as if it were still current, more than once after the relevant cutover/phase PR merged |

### 4. Tier 2 — Hybrid escape hatch (only if §3 trips)

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

### 5. Tier 3 — Nuclear: archive + rename + reclaim name (last resort, rare)

Only if Tier 2 _also_ feels contaminated — e.g. the sibling repo keeps needing ad hoc re-imports because
the port allowlist (§4.2) turns out to be incomplete, or dual-maintaining old and new demos side by side
becomes untenable. Not expected to trigger; documented for transparency, not built out in detail here:

1. Rename the current repo to an archive name (e.g. `chatbot-demo-cloudflare-archive`); add an archive
   banner to its README pointing at the successor.
2. Create a new empty `chatbot-demo-cloudflare` reclaiming the name.
3. Import only a thin docs allowlist (north-star spec/ADR/roadmap, `AGENTS.md`, templates) — no code port.
   Scaffold the app from scratch against the spec.
4. Accept the costs this avoids Tier 1/2 for: issue/PR/#30 discontinuity (old issue URLs 404 on the
   reclaimed name), loss of git history continuity, full re-scaffold of bindings/CI/security hardening
   from memory or by re-reading the archived repo.

## Validation

- After step 1: `git diff main...HEAD --stat` on the cutover PR touches only the archived file's old/new
  path and the deleted component — no other files.
- After each phase branch: the audit table's rows for that phase read `keep`/`banner-added` with no
  stale `Executes` value left pointing at a merged phase.
- `grep -rniE "phase 2|coming soon|reranking|refinement" --include=*.md docs README.md .github | grep -v "^docs/archive"`
  returns no new unflagged hits after each merge.

## Rollback

Each step above is a normal PR — revert via `git revert` on the merge commit if a cutover or phase branch
introduces a regression. Tier 2 (§4) has no rollback once the sibling repo is created and adopted as
canonical; Tier 3 (§5) has no rollback once the rename/reclaim happens. Treat both as points of no return
and confirm with the user first.

## Notes

- Companion audit table: [`../status/doc-audit-agentic-rag.md`](../status/doc-audit-agentic-rag.md)
- Epic: https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/30
- Phase issues: #32, #33, #34, #35, #36
- Escalation shape (Tier 1 in-place → Tier 2 hybrid → Tier 3 nuclear) cross-checked against a parallel
  strategy plan (`.cursor/plans/greenfield_agentic_rewrite_2ce53f3e.plan.md`) that independently reached
  the same structure.
