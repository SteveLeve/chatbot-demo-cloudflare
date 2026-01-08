# Deployment Guide

This guide covers deploying the RAG Portfolio, which uses a modern full-stack Workers architecture where both frontend and backend are deployed together as a single Worker.

## Architecture Overview

This project uses **Cloudflare Workers for full-stack deployment**:

```
┌─────────────────────────────────────────┐
│     Cloudflare Worker (Single Origin)   │
├─────────────────────────────────────────┤
│ Static Assets (React SPA from /public)  │
│ ├─ index.html                            │
│ ├─ /assets/*                             │
│ └─ Served with 304/cache headers        │
├─────────────────────────────────────────┤
│ API Routes (Hono from /src)             │
│ ├─ /api/v1/query                         │
│ ├─ /api/v1/ingest                        │
│ └─ /health, /api/v1/docs, etc.          │
└─────────────────────────────────────────┘
                     ↓
    Deployed with: `npm run deploy`
```

**Why this approach?**
- ✅ Single deployment (`wrangler deploy`)
- ✅ Same origin (no CORS issues)
- ✅ Shared bindings (D1, Vectorize, R2, KV all available to both frontend and API)
- ✅ Better observability (Workers Logs, Tail Workers)
- ✅ Gradual deployments (canary rollouts)
- ✅ All new Cloudflare features available
- ✅ Lower latency (everything is edge-native)

## Prerequisites

Before deploying, ensure:

- [ ] Node.js 18+ installed
- [ ] Cloudflare account
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] All Cloudflare resources created (D1, Vectorize, R2, KV)
- [ ] Environment variables configured in `wrangler.jsonc`
- [ ] Tests passing (`npm test`)
- [ ] Changes committed to git

## Quick Deploy (3 Commands)

```bash
# 1. Apply database migrations
wrangler d1 migrations apply wikipedia-db --remote

# 2. Build frontend (outputs to ./public)
npm run build

# 3. Deploy everything
wrangler deploy
```

Or use the convenience script:

```bash
npm run deploy
```

That's it! Your full-stack app is now live.

## Step-by-Step Deployment

### Step 1: Prepare for Deployment

```bash
# Run tests
npm test

# Verify configuration
wrangler deployments list
```

### Step 2: Build Frontend

The React app builds to the `./public` directory, which Workers serves as static assets.

```bash
npm run build

# Verify build output
ls -la public/
# Should contain: index.html, assets/, etc.
```

### Step 3: Apply Database Migrations

Apply migrations to your production database **before** deploying code that depends on them:

```bash
wrangler d1 migrations apply wikipedia-db --remote

# Verify migrations
wrangler d1 migrations list wikipedia-db --remote
```

### Step 4: Deploy to Production

```bash
# Using convenience script
npm run deploy

# Or manually
wrangler deploy
```

Your Worker will be available at:
```
https://cloudflare-rag-portfolio.<your-subdomain>.workers.dev
https://cloudflare-rag-demo.stevenleve.com (custom domain)
```

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://cloudflare-rag-demo.stevenleve.com/health

# View live logs
wrangler tail

# Check deployment history
wrangler deployments list
```

## Local Development

Development uses `wrangler dev` which runs locally but connects to remote resources (since Vectorize has no local mode):

```bash
# Terminal 1: Start Worker (serves /api/* routes + static assets)
npm run dev

# Terminal 2: Start UI dev server with proxy (optional, for HMR during development)
npm run ui:dev
```

**Note**: Since Vectorize doesn't support local development, `wrangler dev` connects to remote D1, Vectorize, R2, and KV resources. This means local development uses production data.

The UI dev server (port 3000) automatically proxies `/api/*` requests to the Worker (port 8787) via Vite's proxy configuration.

## Configuration

### wrangler.jsonc

Key settings for full-stack deployment:

```jsonc
{
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  }
}
```

This tells Workers to:
1. Serve files from `./public` directory as static assets
2. Bind the assets to the `ASSETS` variable (for programmatic access if needed)
3. Automatically handle routing: static files served, `/api/*` routes go to your Worker code

### Build Output

The React app builds to `./public`:

```typescript
// ui/vite.config.ts
export default defineConfig({
  build: {
    outDir: '../public', // Outputs to project root /public
  },
});
```

**Important**: The `public` directory should NOT be committed to git. It's generated during the build and deployed with the Worker.

Add to `.gitignore`:
```
public/
.wrangler/
.env
```

## Environment Variables

### Development

```bash
# Define in wrangler.jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "INFO"
  }
}
```

### Production Secrets

Set secrets for production:

```bash
# Add production secret
wrangler secret put ANTHROPIC_API_KEY

# List secrets
wrangler secret list
```

## Environment Configuration

This project uses a single production environment. The root configuration in `wrangler.jsonc` is used for production deployments.

**Current setup:**
- **Local development**: `wrangler dev` (uses remote resources)
- **Production**: `wrangler deploy` (deploys to `cloudflare-rag-portfolio` worker)

If you need a staging environment in the future, you can add it to `wrangler.jsonc`:

```jsonc
{
  "env": {
    "staging": {
      "name": "cloudflare-rag-portfolio-staging",
      "vars": { "ENVIRONMENT": "staging" },
      "routes": [
        {
          "pattern": "staging-cloudflare-rag-demo.stevenleve.com",
          "custom_domain": true
        }
      ]
    }
  }
}
```

Then deploy to staging with: `wrangler deploy --env staging`

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          cd ui && npm ci && cd ..

      - name: Run tests
        run: npm test

      - name: Build frontend
        run: npm run build

      - name: Apply migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: d1 migrations apply wikipedia-db --remote

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```

**Setup**:
1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add `CLOUDFLARE_API_TOKEN`:
   - Go to Cloudflare Dashboard → **My Profile** → **API Tokens**
   - Create token with "Edit Cloudflare Workers" permissions

## Monitoring & Observability

### Real-Time Logs

```bash
# Watch all logs
wrangler tail

# Errors only
wrangler tail --status error

# Search logs
wrangler tail --search "user-query"

# Follow specific method
wrangler tail --method GET
```

### Health Checks

The API includes a health endpoint:

```bash
curl https://cloudflare-rag-demo.stevenleve.com/health

# Response:
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "environment": "production"
}
```

### Deployment History

```bash
# List recent deployments
wrangler deployments list

# Deployment details
wrangler deployments list --limit 10
```

## Rollback

If you need to rollback a deployment:

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback <deployment-id>

# Verify rollback
wrangler deployments list
```

## Database Migrations

### Migration Workflow

```bash
# 1. Create migration
wrangler d1 migrations create wikipedia-db add_new_column

# 2. Write SQL in migrations/0xxx_add_new_column.sql
# Example:
# ALTER TABLE chunks ADD COLUMN tags TEXT;

# 3. Apply locally
wrangler d1 migrations apply wikipedia-db

# 4. Test locally
npm run dev

# 5. Apply to production
wrangler d1 migrations apply wikipedia-db --remote

# 6. Deploy code
wrangler deploy
```

**Important**: Always apply migrations **before** deploying code that depends on them.

## Troubleshooting

### Issue: "Cannot find public directory"

**Symptoms**: Build fails, `public/` directory doesn't exist

**Solution**:
```bash
# Ensure frontend is built
npm run build

# Verify output
ls -la public/
```

### Issue: "Static assets not serving"

**Symptoms**: Visiting worker URL shows 404, `/api/*` works but static files don't

**Solutions**:
1. Check `wrangler.jsonc` has `assets` configuration
2. Verify `npm run build` ran successfully
3. Check `public/index.html` exists
4. Inspect: `wrangler publish --dry-run` to see asset list

### Issue: "Database not found"

**Symptoms**: "binding DATABASE not found"

**Solutions**:
1. Verify D1 exists: `wrangler d1 list`
2. Check `database_id` in `wrangler.jsonc` matches your D1
3. Apply migrations: `wrangler d1 migrations apply wikipedia-db --remote`

### Issue: "Migrations won't apply"

**Symptoms**: "Migration error" or "SQL syntax error"

**Solutions**:
1. Check SQL syntax in migration files
2. Verify migrations run in order (names start with 0001_, 0002_, etc.)
3. Try applying locally first: `wrangler d1 migrations apply wikipedia-db --local`
4. Check database is accessible: `wrangler d1 info wikipedia-db --remote`

### Issue: "Changes not live"

**Symptoms**: Updated code not reflecting on live site

**Solutions**:
1. Ensure build succeeded: `npm run build`
2. Verify files in `public/` updated: `ls -l public/`
3. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
4. Check deployment: `wrangler deployments list`
5. Monitor logs: `wrangler tail --status error`

## Cost Estimation

For a production deployment with moderate usage (1000 queries/day):

| Service | Cost | Notes |
|---------|------|-------|
| **Workers** | Free | 100k requests/day free tier |
| **D1** | Free | < 5GB included |
| **Vectorize** | Free | 5M vectors free tier |
| **R2** | $0.015/GB/month | ~$0.30/month for 20MB |
| **KV** | Free | Free tier adequate |

**Estimated monthly cost**: < $1

## Best Practices

1. ✅ Always apply migrations before deploying code
2. ✅ Use `npm run deploy` instead of manual steps
3. ✅ Monitor logs after each deployment
4. ✅ Keep `public/` directory out of git
5. ✅ Use secrets for sensitive values
6. ✅ Tag releases for tracking
7. ✅ Set up gradual deployments for critical updates
8. ✅ Use Worker Observability tools (Logs, Tail, Source Maps)
9. ✅ Test frontend + API integration locally before deploying
10. ✅ Since local dev uses remote resources, be cautious with data modifications

## Next Steps

After initial deployment:

1. Set up a custom domain (optional)
2. Enable Cloudflare Web Analytics
3. Configure error tracking (e.g., Sentry)
4. Set up automated testing (GitHub Actions)
5. Implement gradual deployments for rollouts
6. Monitor performance with Workers Analytics
7. Set up alerts for errors

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [Migration Guide: Pages → Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
