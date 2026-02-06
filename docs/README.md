# Documentation Home

This directory holds living project knowledge. The root stays lean; everything else belongs here.

## Philosophy
- Capture **now & next**: current state, near-term work, owners, and links to GitHub issues/PRs for history.
- Point to **GitHub** for long-tail detail and decisions already merged.
- Use **templates** in `docs/templates/` for consistency.

## Top-Level Map
- `status/` — living status notes, production readiness, security posture.
- `decisions/` — Architecture Decision Records (ADRs) with index.
- `spec/` — feature and API specs.
- `roadmaps/` — concise roadmaps (compliance, observability, performance) with links to GitHub.
- `runbooks/` — operational how-tos and checklists.
- `guides/` — setup and how-to guides.
- `archive/` — historical reports kept for reference.
- `templates/` — templates for ADRs, specs, status notes, runbooks.

## How to Add Docs
1. Pick the right folder (see map above).
2. Start from a template in `docs/templates/`.
3. Link to relevant GitHub issues/PRs for detail.
4. Keep the page short; move long-form history to `archive/` or GitHub.

## Quick Links
- Agent playbook: `docs/AGENTS.md`
- ADR index: `docs/decisions/README.md`
- Status (now & next): `docs/status/now-next.md`
- Roadmaps: `docs/roadmaps/`
