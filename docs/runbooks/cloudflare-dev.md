# Runbook: Cloudflare Dev Session (Remote-first)
- **Last Updated**: 2026-02-06
- **Purpose**: Start a reliable dev session using remote Cloudflare resources (Workers AI, Vectorize, D1).

## Prereqs
- `wrangler` installed and logged in (`wrangler login`).
- Node deps installed (`npm install`; `cd ui && npm install` if touching UI).

## Steps
1. **Validate config**: skim `wrangler.jsonc` for binding IDs and env vars.
2. **Start API dev (remote)**:
   ```bash
   wrangler dev --remote --port 8787
   ```
   - Use `--env <name>` if testing a specific environment.
3. **Start UI (optional)**:
   ```bash
   npm run ui:dev
   ```
   - Vite proxy hits the Worker on port 8787.
4. **Run migrations locally (if schema changed)**:
   ```bash
   npm run db:migrate
   ```
5. **Watch logs**: confirm bindings resolve; fix any missing secrets or IDs.

## Validation
- Health check: GET http://localhost:8787/health returns 200.
- Query endpoint returns results; no “binding not found” errors.
- For AI/Vectorize calls, ensure remote mode is active (no local stubs).

## Notes
- Remote-only services require `--remote`; without it, AI/Vectorize/D1 fail locally.
- Rate limiters are active; heavy load may return 429.

