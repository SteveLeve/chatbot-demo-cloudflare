---
name: wrangler-workflows
description: Operate wrangler for this project. Active validation of dev/deploy states via MCP.
---

# Wrangler Workflows

Use for commands, flags, and validation steps with wrangler in this repo.

## Defaults
- Remote-only resources (Workers AI, Vectorize, D1) → `wrangler dev --remote`.
- Scripts: `npm run dev`, `npm run ui:dev`, `npm run deploy:production`.
- Bindings in `wrangler.jsonc`.

## Tools
- `mcp__CloudflareBindings__*`: Verify binding existence/state.
- `mcp__CloudflareObservability__*`: verify logs after deploy.

## Dev workflow
1) **Setup**: `npm install`; `wrangler login`.
2) **Run**: `wrangler dev --remote --port 8787`.
3) **Verify (Active)**:
   - Use Bindings MCP to check if `wrangler dev` is picking up remote data (e.g. `d1_query`).
4) **UI**: `npm run ui:dev` (proxies to 8787).

## Deploy workflow
1) **Build**: `npm run build`.
2) **Migrate**: `npm run db:migrate:remote`.
3) **Deploy**: `wrangler deploy` (or `npm run deploy:production`).
4) **Verify (Active)**:
   - Use Observability MCP to check for immediate errors.
   - Use Bindings MCP to confirm migrations applied (check schema).

## Secrets
- `wrangler secret put <NAME>` (e.g., `CHAT_LOG_IP_SALT`).

## Troubleshooting
- "Binding not found": Fix `wrangler.jsonc` IDs.
- Rate limits: Active check via Observability.
