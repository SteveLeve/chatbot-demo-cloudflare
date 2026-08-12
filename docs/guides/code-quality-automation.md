# Code Quality Automation — Implementation Guide

**Current Status**: Complete (Phases 1–5). Tracked in [#40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40).

## Overview

Mechanical quality gates for this single-Worker + Vite-UI repo: ESLint, Prettier, a pre-commit hook, CI, required status checks on `main`, a coverage floor, and a Dependency Review gate on PRs. Does **not** include Semgrep or dependency-graph analysis — see [Explicitly out of scope](#explicitly-out-of-scope).

## What landed

| Phase                                                         | Status | Artifacts                                                                                                                                   |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Lint + format + typecheck                                 | Done   | `eslint.config.js`, `ui/eslint.config.js`, `.prettierrc`, `.prettierignore`, root scripts                                                   |
| 2 — Pre-commit                                                | Done   | Husky, lint-staged, split `.lintstagedrc.json` (root + `ui/`)                                                                               |
| 3 — CI                                                        | Done   | `.github/workflows/ci.yml` (Node 24); green on `main` after [PR #43](https://github.com/SteveLeve/chatbot-demo-cloudflare/pull/43)          |
| 4 — Enforce on merge                                          | Done   | `protect-main` ruleset requires status checks `root` + `ui`                                                                                 |
| 5 — Format/lint strictness, coverage floor, dependency review | Done   | `format:check` + coverage step in `ci.yml`, `--max-warnings 0` at root, `.github/workflows/dependency-review.yml`, `.github/dependabot.yml` |

**Formatting policy**: enforced — the repo was reformatted once (`npm run format`) and `format:check` now runs in the `root` CI job, so drift can't reaccumulate. Pre-commit (lint-staged) still auto-fixes staged files as before; CI is the backstop for anything that slips through.

## Commands (acceptance criteria)

```bash
npm run lint                  # exits 0 — root ESLint (--max-warnings 0) + ui lint
npm run format:check          # exits 0 — repo-wide Prettier check
npm run typecheck             # exits 0 — tsc --noEmit (src, scripts, tests)
npm run test:coverage -- --run  # exits 0 — vitest single pass + coverage thresholds (CI sets CI=true)
```

Pre-commit: stage a misformatted file → `git commit` auto-fixes via lint-staged.

## Branch protection / ruleset

### Snapshot before enforcement (2026-08-09)

```text
gh api repos/SteveLeve/chatbot-demo-cloudflare/branches/main/protection
→ 404 "Branch not protected"

gh api repos/SteveLeve/chatbot-demo-cloudflare/rulesets
→ active ruleset "protect-main" (id 11921368):
  - required PR, linear history, code-owner review, squash merge
  - NO required status checks (CI advisory)
```

Decision at first merge ([PR #42](https://github.com/SteveLeve/chatbot-demo-cloudflare/pull/42)): ship CI without requiring checks so the workflow could appear on `main`.

### Post-merge CI fix (2026-08-09 / [PR #43](https://github.com/SteveLeve/chatbot-demo-cloudflare/pull/43))

- Merge push CI failed: `npm ci` under Node 20 / npm 10 reported `Missing: @cloudflare/workers-types@4.20260702.1` (optional peer; lockfile written with npm 11).
- Fix: pin workflow to **Node 24** (npm 11) and set `package.json` `engines.node` to `>=24.11.0`.
- CI on `main` green: [run 31348577919](https://github.com/SteveLeve/chatbot-demo-cloudflare/actions/runs/31348577919).

### Enforcement (2026-08-09)

`protect-main` (id 11921368) now includes:

```text
required_status_checks:
  - context: root
  - context: ui
  strict_required_status_checks_policy: true
```

Job contexts match `.github/workflows/ci.yml` job names (`root`, `ui`). Existing PR / linear-history / code-owner / squash rules unchanged.

## Pre-commit timing (measured 2026-08-09)

Single staged root TS file (`src/utils/chunking.ts`): **~2.0s** wall time for `npx lint-staged` (eslint --fix + prettier --write).

## Audit snapshot (before #40)

| Area             | Finding                                     |
| ---------------- | ------------------------------------------- |
| Root lint/format | None                                        |
| Root typecheck   | No script                                   |
| Root coverage    | `test:coverage` broken (still out of scope) |
| `ui/` lint       | Script existed but no `eslint.config.js`    |
| CI               | None                                        |
| Pre-commit       | None                                        |

## Phase details

### Phase 1 — Root ESLint + Prettier

- Root `eslint.config.js` covers `src/`, `scripts/`, `tests/`; ignores `ui/`, `.venv/`, generated types.
- `ui/eslint.config.js` — React hooks + refresh plugins.
- `ui/.npmrc` — `legacy-peer-deps=true` for `@cloudflare/ai-chat` peer React 19 vs React 18.

### Phase 2 — Pre-commit gate

```jsonc
// package.json
{ "prepare": "husky || true" }
```

Root `.lintstagedrc.json` and `ui/.lintstagedrc.json` — lint-staged picks nearest config per staged file.

### Phase 3 — CI workflow

`.github/workflows/ci.yml` (Node **24**):

- **root** (updated in Phase 5, see below): `npm ci` → `npx eslint . --max-warnings 0` → `npm run format:check` → typecheck → `npm run test:coverage -- --run` (not `npm run lint` — that also hits `ui/` and needs a separate install)
- **ui**: `npm ci` → lint → build (`ui/.npmrc` applies in CI)

### Phase 4 — Enforce CI on merge

Required status checks on `protect-main` so PRs cannot merge to `main` unless `root` and `ui` succeed on the latest head (`strict_required_status_checks_policy: true`).

### Phase 5 — Format/lint strictness, coverage floor, dependency review

- `ci.yml` `root` job: `npx eslint . --max-warnings 0` (was previously warning-tolerant at root; `ui/` already enforced this), then `npm run format:check` (repo-wide, `.prettierignore` scopes out `node_modules`, build outputs, and `.remember`), then `npm run test:coverage -- --run` (was `npm test -- --run`).
- `vitest.config.ts` gained a `coverage` block: `provider: 'v8'`, `include` scoped to `src/utils/**`, `src/ai/**`, `src/eval/**`, `src/redteam/**` (the pure-function areas the suite actually exercises — routes/DO/Workflows aren't unit-testable without Miniflare bindings) and `thresholds` set a few points below the measured baseline (~47% statements/lines, ~71% branches, ~73% functions at landing time) — a regression floor, not a coverage target. `@vitest/coverage-v8` added as a root devDependency (was missing; `test:coverage` was previously broken).
- `.github/workflows/dependency-review.yml` (new): `actions/dependency-review-action@v4` on `pull_request`, `fail-on-severity: high`. No GHAS license needed.
- `.github/dependabot.yml` (new): weekly `npm` update PRs for `/` and `/ui` (separate lockfiles), grouped by minor/patch; weekly `github-actions` updates.

## Explicitly out of scope

- Security scanning (Semgrep) — Dependency Review (Phase 5) covers known-vulnerable _dependencies_ in PR diffs; it does not scan first-party source for security issues.
- Dependency-graph analysis (dependency-cruiser / knip) — architectural/import-graph linting, distinct from the GitHub Dependency Review Action added in Phase 5.
- `CONTRIBUTING.md`

## References

- [Issue #40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40)
- [PR #42](https://github.com/SteveLeve/chatbot-demo-cloudflare/pull/42) — Phases 1–3
- [PR #43](https://github.com/SteveLeve/chatbot-demo-cloudflare/pull/43) — Node 24 CI pin
- [`docs/status/now-next.md`](../status/now-next.md)
