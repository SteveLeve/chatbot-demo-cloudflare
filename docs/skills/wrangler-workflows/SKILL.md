---
name: wrangler-workflows
description: Operate wrangler for this project: dev (remote), deploy, migrations, secrets, bindings validation, and workflow execution.
---

# Wrangler Workflows

Use for commands, flags, and validation steps with wrangler in this repo.

## Defaults for this project
- Remote-only resources (Workers AI, Vectorize, D1) → use `wrangler dev --remote`.
- Scripts: `npm run dev`, `npm run ui:dev`, `npm run deploy:production`, `npm run db:migrate[:remote]`.
- Bindings live in `wrangler.jsonc`; keep `nodejs_compat` flag.

## Dev workflow
1) Install deps if needed: `npm install` (and `cd ui && npm install` if UI work).
2) Run `wrangler dev --remote --port 8787` from repo root; ensure `wrangler login` done.
3) For UI: `npm run ui:dev` in parallel.
4) Watch logs; fix binding errors by matching names in `wrangler.jsonc`.

## Deploy workflow
1) Build UI: `npm run build`.
2) Apply D1 migrations: `npm run db:migrate:remote`.
3) Deploy: `wrangler deploy` (or `npm run deploy:production`).
4) Verify routes/custom domain; check rate-limiters and secrets present.

## Migrations
- Create: `npm run db:create-migration -- <name>`.
- Apply local: `npm run db:migrate`.
- Apply remote: `npm run db:migrate:remote` (required before deploy).

## Secrets
- Use `wrangler secret put <NAME>` (e.g., `CHAT_LOG_IP_SALT`). Keep salts out of vars.

## Troubleshooting
- Binding not found → re-run `wrangler dev --remote` or fix `wrangler.jsonc` IDs.
- Vectorize/AI errors locally → must be remote mode.
- Rate limit errors → adjust limiter config or lower test load.

