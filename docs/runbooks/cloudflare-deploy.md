# Runbook: Cloudflare Deploy
- **Last Updated**: 2026-02-06
- **Purpose**: Safe deploy of the Worker + UI with remote resources.

## Prereqs
- `wrangler` logged in; production bindings present in `wrangler.jsonc`.
- Secrets set (e.g., `CHAT_LOG_IP_SALT`).

## Steps
1. **Build UI**:
   ```bash
   npm run build
   ```
2. **Apply remote migrations**:
   ```bash
   npm run db:migrate:remote
   ```
3. **Deploy Worker**:
   ```bash
   wrangler deploy
   ```
   - Or `npm run deploy:production` (build + migrate + deploy).
4. **Smoke tests**:
   - Hit `/health` on the custom domain.
   - Run a sample `/api/v1/query` and confirm sources return.
   - Verify rate limiting and security headers present.
5. **Post-deploy checks**:
   - Confirm routes/custom domain active.
   - Check logs for errors; ensure cache hits (if embedding cache/AI Gateway enabled).

## Rollback
- `wrangler deploy --env <prev>` if using staged envs; otherwise redeploy previous build artifact.

## Notes
- Remote-only services (AI/Vectorize/D1) require working IDs; deploy will fail if missing.
- If AI Gateway is enabled, confirm gateway ID set before deploy.

