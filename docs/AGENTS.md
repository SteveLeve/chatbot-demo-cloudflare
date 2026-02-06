# Agent & Documentation Playbook

## Purpose
Provide consistent, lightweight documentation that captures current state and next steps while deferring deep history to GitHub issues/PRs and git history.

## Principles
- **Now & Next first**: every living doc should state current status and the immediate next actions with owners.
- **Link, don’t duplicate**: reference GitHub issues/PRs for details, past discussions, and acceptance evidence.
- **Templates everywhere**: start from `docs/templates/` to keep structure consistent.
- **Minimal root**: only `README.md` and the short root `AGENTS.md` live at repo root; all other docs are under `docs/`.

## Where to Put Things
- Architecture decisions → `docs/decisions/` (ADR format)
- Feature/API specs → `docs/spec/`
- Status and readiness → `docs/status/`
- Roadmaps (brief) → `docs/roadmaps/`
- Runbooks/ops checklists → `docs/runbooks/`
- Guides/how-tos → `docs/guides/`
- Historical full-text → `docs/archive/`
- Templates → `docs/templates/`
- Codex skills (specialist playbooks) → `docs/skills/` (one folder per skill with `SKILL.md`)

## When to Create Each Doc Type
- **ADR**: choose when an architectural trade-off is made or reversed. Name `adr-YYYYMMDD-title.md`. One decision per file. Link to the driving issue/PR.
- **Spec**: before implementing a significant feature or API change. Define scope, UX/API surfaces, edge cases, and tests. Name `spec-feature-name.md`.
- **Status (now-next)**: rolling summary of active tracks, owners, and links. Keep concise; update weekly or after notable changes.
- **Roadmap**: thin outline of objectives, milestones, and canonical issue links. Avoid verbose narrative; move deep analysis to `archive/` or GitHub.
- **Runbook**: repeatable operational steps (deploy, rotate secrets, debug incidents). Keep step-by-step and time-boxed.

## Linking Guidelines
- Prefer GitHub URLs to closed issues/PRs for evidence and history.
- In ADRs/specs, include a **References** section with issue/PR numbers.
- Use relative links for in-repo files; absolute GitHub links for discussion threads.

## Templates
Located in `docs/templates/`:
- `adr.md`
- `spec.md`
- `status-now-next.md`
- `runbook.md`

## Example Flow (Security Hardening)
1. Open issue(s) in GitHub (e.g., #6–#11) to track risk.
2. Draft ADR summarizing the decision and outcomes in `docs/decisions/`.
3. Keep ongoing work visible in `docs/status/now-next.md` with owners and links to PRs.
4. If long analysis is needed, store it in `docs/archive/` and link from the roadmap/status pages.

## Maintenance Cadence
- **Weekly**: refresh `docs/status/now-next.md` and add links to newly closed issues/PRs.
- **Per decision**: add/update ADRs.
- **Per feature**: add/update spec before coding begins.
- **Per release**: sanity-check links and trim outdated sections.

## Contact & Ownership
- Default doc owner: the engineer driving the change.
- If unclear, defer to the project maintainer to assign an owner before merging.
