# Code Quality Automation — Implementation Guide

**Current Status**: Complete (Phases 1–3). Tracked in [#40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40).

## Overview

Mechanical quality gates for this single-Worker + Vite-UI repo: ESLint, Prettier, a pre-commit hook, and a CI workflow. Does **not** include Semgrep, dependency-graph analysis, or coverage gates — see [Explicitly out of scope](#explicitly-out-of-scope).

## What landed

| Phase                         | Status | Artifacts                                                                                 |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| 1 — Lint + format + typecheck | Done   | `eslint.config.js`, `ui/eslint.config.js`, `.prettierrc`, `.prettierignore`, root scripts |
| 2 — Pre-commit                | Done   | Husky, lint-staged, split `.lintstagedrc.json` (root + `ui/`)                             |
| 3 — CI                        | Done   | `.github/workflows/ci.yml`                                                                |

**Formatting policy**: incremental — Prettier runs on staged files via pre-commit, not a repo-wide format commit. `npm run format:check` may fail on untouched files until they are edited.

## Commands (acceptance criteria)

```bash
npm run lint       # exits 0 — root ESLint + ui lint
npm run typecheck  # exits 0 — tsc --noEmit (src, scripts, tests)
npm test -- --run  # exits 0 — vitest single pass (CI sets CI=true)
```

Pre-commit: stage a misformatted file → `git commit` auto-fixes via lint-staged.

## Branch protection (recorded 2026-08-09)

```text
gh api repos/SteveLeve/chatbot-demo-cloudflare/branches/main/protection
→ 404 "Branch not protected"

gh api repos/SteveLeve/chatbot-demo-cloudflare/rulesets
→ active ruleset "protect-main" (id 11921368):
  - required PR, linear history, code-owner review, squash merge
  - NO required status checks (CI is advisory until ruleset updated)
```

Decision: ship CI without updating the ruleset to require the workflow (first PR only adds the check).

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

`.github/workflows/ci.yml`:

- **root**: `npm ci` → lint → typecheck → `npm test -- --run`
- **ui**: `npm ci` → lint → build (`ui/.npmrc` applies in CI)

No `format:check` in CI (incremental formatting).

## Explicitly out of scope

- Security scanning (Semgrep)
- Dependency-graph analysis (dependency-cruiser / knip)
- Coverage gates (`test:coverage` still broken)
- Ruleset update to require CI status check (deferred)
- `CONTRIBUTING.md`

## References

- [Issue #40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40)
- [`docs/status/now-next.md`](../status/now-next.md)
