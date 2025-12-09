# Deployment Guide

This guide covers deploying the RAG Portfolio to production, including both the backend (Worker) and frontend (React SPA).

## Architecture Overview

This project uses a **two-tier deployment architecture**:

1. **Backend**: Cloudflare Worker (Hono API) - Deployed via Wrangler
2. **Frontend**: React SPA - Deployed to Cloudflare Pages (or any static host)

The frontend and backend are deployed **separately** and communicate via HTTP API calls.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All Cloudflare resources are created (D1, Vectorize, R2, KV)
- [ ] Database migrations are written and tested locally
- [ ] Environment variables are configured in `wrangler.jsonc`
- [ ] Secrets are ready (if using external APIs)
- [ ] Tests are passing (`npm test`)
- [ ] Code is committed to git

## Step 1: Deploy Backend (Worker)

### 1.1 Apply Database Migrations

Apply migrations to your production database:

```bash
# Apply D1 migrations to remote database
wrangler d1 migrations apply wikipedia-db --remote

# Verify migrations
wrangler d1 migrations list wikipedia-db --remote
```

**Important**: Always apply migrations **before** deploying Worker code that depends on them.

### 1.2 Set Production Secrets (Optional)

If you're using external APIs (e.g., Anthropic Claude):

```bash
# Set secrets for production
wrangler secret put ANTHROPIC_API_KEY --env production
```

### 1.3 Deploy Worker

```bash
# Deploy to production
npm run deploy:production

# Or use wrangler directly
wrangler deploy --env production
```

After deployment, your Worker will be available at:
```
https://cloudflare-rag-portfolio.<your-subdomain>.workers.dev
```

**Save this URL** - you'll need it to configure the frontend.

### 1.4 Verify Deployment

```bash
# Check deployment status
wrangler deployments list

# Test the API
curl https://cloudflare-rag-portfolio.YOUR-SUBDOMAIN.workers.dev/health

# Monitor logs
wrangler tail --env production
```

## Step 2: Deploy Frontend (React App)

### 2.1 Configure Production API URL

Create a production environment file:

```bash
cd ui
cp .env.production.example .env.production
```

Edit `ui/.env.production`:

```env
# Replace with your actual Worker URL
VITE_API_BASE_URL=https://cloudflare-rag-portfolio.YOUR-SUBDOMAIN.workers.dev
```

### 2.2 Build the Frontend

```bash
cd ui
npm run build
```

This creates a production build in `ui/dist/`.

### 2.3 Deploy to Cloudflare Pages

**Option A: Deploy via Wrangler (One-time)**

```bash
# From ui/ directory
wrangler pages deploy dist --project-name=rag-portfolio-ui
```

The first deployment creates the project. Subsequent deployments update it.

**Option B: Continuous Deployment via Git (Recommended)**

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages**
3. Click **Create a project** → **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: `cd ui && npm install && npm run build`
   - **Build output directory**: `ui/dist`
   - **Root directory**: `/` (leave default)
   - **Environment variables**: Add `VITE_API_BASE_URL` with your Worker URL

6. Click **Save and Deploy**

### 2.4 Configure Custom Domain (Optional)

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `rag-demo.example.com`)
4. Follow DNS configuration instructions

## Step 3: Post-Deployment Verification

### 3.1 Test the Full Stack

1. Visit your deployed frontend URL
2. Try asking a question
3. Verify the answer appears with sources
4. Check browser console for errors

### 3.2 Monitor Logs

```bash
# Watch Worker logs
wrangler tail --env production

# Filter for errors
wrangler tail --env production --status error

# Search for specific requests
wrangler tail --env production --search "query"
```

### 3.3 Check Analytics

- Go to Cloudflare Dashboard → **Workers & Pages**
- Select your Worker
- View metrics: requests, errors, CPU time, duration

## Environment Variables Reference

### Backend (wrangler.jsonc)

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "LOG_LEVEL": "INFO",
    "ENABLE_TEXT_SPLITTING": true,
    "DEFAULT_CHUNK_SIZE": 500,
    "DEFAULT_CHUNK_OVERLAP": 100,
    "DEFAULT_TOP_K": 3,
    "MAX_QUERY_LENGTH": 500
  }
}
```

### Frontend (ui/.env.production)

```env
VITE_API_BASE_URL=https://your-worker.workers.dev
```

## Deployment Scripts

Add these npm scripts to your root `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run deploy:backend && npm run deploy:frontend",
    "deploy:backend": "wrangler d1 migrations apply wikipedia-db --remote && wrangler deploy --env production",
    "deploy:frontend": "cd ui && npm run build && wrangler pages deploy dist --project-name=rag-portfolio-ui"
  }
}
```

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

      - name: Apply D1 migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: d1 migrations apply wikipedia-db --remote

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production

      - name: Build frontend
        run: cd ui && npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.WORKER_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy ui/dist --project-name=rag-portfolio-ui
```

**Setup**:
1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `WORKER_URL`: Your deployed Worker URL

## Rollback

If you need to rollback a deployment:

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback <deployment-id>

# Verify
wrangler deployments list
```

## Troubleshooting

### Issue: Frontend can't reach backend

**Symptoms**: Network errors, CORS errors in browser console

**Solutions**:
1. Verify `VITE_API_BASE_URL` is set correctly in `.env.production`
2. Check Worker CORS is enabled (it is by default in `src/index.ts`)
3. Verify Worker is deployed and accessible
4. Check browser network tab for the actual URL being called

### Issue: Database not found

**Symptoms**: "binding DATABASE not found"

**Solutions**:
1. Ensure D1 database is created: `wrangler d1 list`
2. Verify `database_id` in `wrangler.jsonc` matches your D1 database
3. Check migrations are applied: `wrangler d1 migrations list wikipedia-db --remote`

### Issue: Vectorize index not found

**Symptoms**: "binding VECTOR_INDEX not found"

**Solutions**:
1. Create Vectorize index: `wrangler vectorize create wikipedia-vectors --preset @cf/baai/bge-base-en-v1.5`
2. Verify index exists: `wrangler vectorize list`
3. Update `wrangler.jsonc` with correct index name

### Issue: Build fails on Pages

**Symptoms**: Build command fails in Pages deployment

**Solutions**:
1. Ensure build command is correct: `cd ui && npm install && npm run build`
2. Check build output directory: `ui/dist`
3. Verify all dependencies are in `package.json` (not devDependencies if needed at build time)
4. Add `VITE_API_BASE_URL` environment variable in Pages settings

## Cost Estimation

For a production deployment with moderate usage (1000 queries/day):

- **Workers**: Free tier (100k requests/day)
- **D1**: Free (under 5GB)
- **Vectorize**: Free tier (5M vectors)
- **R2**: ~$0.015/GB-month
- **KV**: Free tier
- **Pages**: Free (500 builds/month)

**Estimated monthly cost**: < $1

## Next Steps

1. Set up custom domain for frontend
2. Configure analytics and monitoring
3. Set up error tracking (e.g., Sentry)
4. Enable Cloudflare Web Analytics for frontend
5. Implement deployment previews for pull requests
6. Set up staging environment

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
