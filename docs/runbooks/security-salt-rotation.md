# Runbook: Rotate CHAT_LOG_IP_SALT
- **Last Updated**: 2026-02-06
- **Owner**: Security & Backend Team
- **Prereqs**: Wrangler CLI access to prod env; ability to deploy Worker

## When to Run
- Quarterly or after suspected credential exposure.

## Steps
1. Generate new salt: `openssl rand -base64 32`.
2. Set secret in prod: `wrangler secret put CHAT_LOG_IP_SALT --env production` and paste value.
3. Set secret in staging if applicable: `wrangler secret put CHAT_LOG_IP_SALT --env staging`.
4. Redeploy: `npm run deploy`.
5. Verify health: `curl https://cloudflare-rag-demo.stevenleve.com/health` returns 200.
6. Send a test chat; confirm logs are written with new hash.

## Validation
- Health endpoint 200.
- Log entries present; no startup warnings about salt.

## Rollback
- Reapply previous salt secret (if saved) and redeploy. Note: hashes will change across rotations; this is expected.

## Notes
- Background and rationale: `../archive/SECURITY_REMEDIATION.md` (issue #6).
