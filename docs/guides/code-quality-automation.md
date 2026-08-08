# Code Quality Automation — Implementation Guide

**Current Status**: Not started. Tracked in [#40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40). No linting, formatting, pre-commit hooks, or CI exist in this repo yet.

## Overview

This repo has no mechanical quality backstop today — everything depends on manual review. This guide adds the essentials for a small, single-Worker + Vite-UI repo: linting, formatting, a pre-commit gate, and a CI workflow. It deliberately **does not** adopt the full stack (Semgrep, dependency-graph analysis, coverage gates) that a larger monorepo would need — see [Explicitly out of scope](#explicitly-out-of-scope).

The method here — audit before implementing, roll out advisory-first, state acceptance criteria as runnable commands, write down what you couldn't verify — is adapted from a broader quality-stack guide built for a 15-package pnpm monorepo. That guide's scope doesn't fit this repo's size; its method does.

## Audit findings

Written down here so they don't go stale in a closed issue (see [#40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40) for the original writeup).

| Area | Finding |
| --- | --- |
| Root lint/format | None. No ESLint, no Prettier, no `.editorconfig`. |
| Root typecheck | `tsconfig.json` is strict, but there's no `typecheck` script exposing it. |
| Root coverage | `test:coverage` script exists but is **broken** — no `@vitest/coverage-*` devDependency, no `vitest.config.*` with thresholds. Not fixed by this work; flagged for a future pass. |
| `ui/` lint | ESLint 9 + `@typescript-eslint` + `eslint-plugin-react-hooks`/`react-refresh` already configured, with a `lint` script. No Prettier. |
| Project layout | Root and `ui/` are **two separate npm projects** (no npm workspaces) — two `node_modules`, two config-resolution roots. |
| CI | No `.github/workflows/` directory at all. |
| Pre-commit | No Husky/lint-staged/simple-git-hooks. `.git/hooks/` has only the default samples. |
| Branch protection | Unconfirmed. Run `gh api repos/SteveLeve/chatbot-demo-cloudflare/branches/main/protection` (and `/rulesets`) and record the literal result before assuming a CI check can block a merge. Public repo, so protection is available for free — worth actually enabling rather than leaving every gate advisory-only. |
| Contributor docs | No `CONTRIBUTING.md`. `AGENTS.md`/`docs/AGENTS.md` cover the docs playbook, not lint/format/CI conventions. |

## Phase 1 — Root ESLint + Prettier

**Preconditions**: none — this is the first phase.

**Lands**: a root flat ESLint config, Prettier + ignore file, and `lint`/`format`/`format:check`/`typecheck` scripts at root, plus a combined script that also runs `ui/`'s existing lint.

Add root-level devDependencies mirroring `ui/`'s already-working setup (`eslint`, `typescript-eslint`, `@eslint/js`) plus `prettier`. A root `eslint.config.js` (flat config) should cover `src/`, `scripts/`, `tests/` — look at `ui/eslint.config.js` for the pattern already validated in this repo, and reuse the same `@typescript-eslint` rule baseline where it applies (Node/Workers code doesn't need the React-specific plugins).

```jsonc
// package.json (root) — additions
{
  "scripts": {
    "lint": "eslint . && npm run lint --prefix ui",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

```gitignore
# .prettierignore
node_modules
ui/node_modules
package-lock.json
ui/package-lock.json
dist
ui/dist
.wrangler
data/corpus
```

**Verify**

```bash
npm run lint          # exits 0 on the current clean tree
npm run typecheck     # exits 0
npm run format:check  # exits 0 (or lists exactly the files that need formatting, on first run)
```

**Traps**

- Don't let the root Prettier glob touch `package-lock.json` or `ui/package-lock.json` — a formatter rewriting a lockfile against the package manager produces enormous diffs on the next dependency change.
- If a shared/root ESLint config needs to resolve plugins that `ui/` already declares, resolve them from the config file's own location, not the caller's CWD — otherwise `ui/`'s config can silently fail to find its React plugins when invoked from root.

## Phase 2 — Pre-commit gate

**Preconditions**: Phase 1 complete — a broken formatter or linter turned into a commit gate fails on every commit.

**Lands**: Husky + lint-staged, with the pre-commit hook running per-project so root and `ui/` each resolve their own ESLint config correctly.

```jsonc
// package.json (root)
{ "scripts": { "prepare": "husky || true" } }
```

```sh
#!/usr/bin/env sh
# .husky/pre-commit
set -e

npx lint-staged
```

Because root and `ui/` are two separate npm projects — not workspaces — a single root `.lintstagedrc.json` cannot correctly resolve `ui/`'s ESLint config for staged `ui/` files. Use two config files:

```json
// .lintstagedrc.json (root) — matches src/, scripts/, tests/
{
  "*.{ts,tsx,js,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

```json
// ui/.lintstagedrc.json — matches ui/ files only
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

lint-staged auto-discovers the nearest config relative to each staged file's directory, so this split is what makes each project's ESLint config resolve correctly — a single root config running `eslint` against a `ui/*.tsx` file would fail to find `ui/`'s React-aware rules.

**Verify**

```bash
# stage a misformatted file in src/ and in ui/, then:
git commit -m "test"   # both get auto-fixed and restaged; report the timing here once measured
```

**Traps**

- Pin lint-staged/husky as devDependencies rather than invoking via `npx <tool>@latest` in the hook — an unpinned lifecycle script is a moving target.
- If `core.hooksPath` is ever set to something other than `.husky`, Husky repoints it silently rather than erroring. `git config --unset core.hooksPath` is the recovery step if hooks stop firing after this phase lands.

## Phase 3 — CI workflow

**Preconditions**: Phases 1–2 complete, so CI is checking the same commands a contributor already runs locally.

**Lands**: `.github/workflows/ci.yml`, running lint/typecheck/test for both projects on every push/PR to `main`.

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  root:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  ui:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm", cache-dependency-path: ui/package-lock.json }
      - run: npm ci
        working-directory: ui
      - run: npm run lint
        working-directory: ui
      - run: npm run build
        working-directory: ui
```

**Verify**

```bash
# push a branch with a deliberately broken/misformatted file → CI job fails
# push a clean branch → CI passes
gh api repos/SteveLeve/chatbot-demo-cloudflare/branches/main/protection   # record the literal output here once run
```

**Traps**

- A green CI check is not the same as an enforced gate. Confirm branch protection/rulesets actually require this check before treating it as a merge blocker — record whatever `gh api .../protection` returns, including a 404/403, rather than assuming.
- Don't duplicate any scanning GitHub already runs automatically (e.g. Dependabot alerts, default CodeQL setup if enabled) — check what's already active under the repo's Security tab before adding more.

## Explicitly out of scope

- **Security scanning (Semgrep)** — no secrets/injection-pattern tooling yet. Revisit if the app starts handling more sensitive data flows or gains contributors.
- **Dependency-graph analysis (dependency-cruiser / knip)** — useful for catching structural drift in large module graphs; this repo (~16 root TS files, ~44 UI files) is too small to justify the setup cost yet.
- **Coverage gates** — `test:coverage` is broken today (see audit above). Getting it working is worthwhile on its own, but a coverage *gate* needs coverage emitted from every meaningful test surface first, and this repo currently has 2 test files.
- **Revisit trigger**: the codebase growing meaningfully past its current single-Worker + UI shape, or a second contributor with write access joining.

## References

- [Issue #40](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/40) — tracking issue for this work
- [`docs/status/now-next.md`](../status/now-next.md) — current epic/phase context
- Full 8-phase reference guide (ESLint + Semgrep + coverage + dependency-cruiser/knip + module boundaries + enforcement audit), written for a larger monorepo: `partnership-tool/.docs/reports/quality-stack-implementation-guide.md` — worth revisiting in full if this repo outgrows the essentials above.
