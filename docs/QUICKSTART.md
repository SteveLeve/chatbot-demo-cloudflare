# Quick Start Guide

Get your Cloudflare RAG Portfolio running in minutes.

## Prerequisites

- Node.js 18 or later
- A Cloudflare account (free tier works!)
- Wrangler CLI installed globally

```bash
npm install -g wrangler
```

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install UI dependencies
cd ui && npm install && cd ..
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

### 3. Create Cloud Resources

Run each command and note the IDs returned:

```bash
# Create D1 database
wrangler d1 create wikipedia-db
# Note the database_id

# Create Vectorize index
wrangler vectorize create wikipedia-vectors --preset @cf/baai/bge-base-en-v1.5
# Index created automatically

# Create R2 bucket
wrangler r2 bucket create wikipedia-articles
# Bucket created

# Create KV namespaces
wrangler kv:namespace create EMBEDDINGS_CACHE
# Note the id

wrangler kv:namespace create RAG_CACHE
# Note the id
```

### 4. Update Configuration

Edit `wrangler.jsonc` and replace the placeholder IDs:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DATABASE",
      "database_id": "YOUR_D1_DATABASE_ID_HERE"  // From step 3
    }
  ],
  "kv_namespaces": [
    {
      "binding": "EMBEDDINGS_CACHE",
      "id": "YOUR_EMBEDDINGS_CACHE_ID_HERE"  // From step 3
    },
    {
      "binding": "RAG_CACHE",
      "id": "YOUR_RAG_CACHE_ID_HERE"  // From step 3
    }
  ]
}
```

### 5. Run Database Migrations

```bash
# Local database (for development)
wrangler d1 migrations apply wikipedia-db --local

# Remote database (for production, when ready)
wrangler d1 migrations apply wikipedia-db --remote
```

You should see:
```
✅ Successfully applied 3 migrations.
```

### 6. Fetch Wikipedia Data

Use the included fetch script to download Wikipedia articles:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Fetch ~10MB of Wikipedia articles (recommended for demos)
python scripts/fetch-wikipedia.py --size-mb 10
```

This will download ~2000 articles from the Simple English Wikipedia and save them to `data/wikipedia/`.

**What happens:**
- Downloads articles from `wikimedia/wikipedia` dataset
- Filters out very short articles (< 500 chars)
- Converts to required JSON format
- Saves individual files for each article
- Creates `_fetch_metadata.json` with statistics

**Alternative options:**
```bash
# Fetch specific number of articles
python scripts/fetch-wikipedia.py --articles 1500

# Fetch from full English Wikipedia
python scripts/fetch-wikipedia.py --size-mb 10 --lang en

# Smaller dataset for quick testing
python scripts/fetch-wikipedia.py --size-mb 5
```

### 7. Start Development Servers

You need **two separate terminal windows** to run both the backend API and frontend UI:

**Terminal 1 - Start Backend (Hono API Worker):**

```bash
npm run dev
```

This starts the Wrangler development server. You should see:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

The backend provides REST API endpoints:
- `GET /` - API info
- `GET /health` - Health check
- `GET /api/v1/query?q=...` - Query the RAG system
- `POST /api/v1/query` - Query with POST body
- `POST /api/v1/ingest` - Ingest new articles
- `GET /api/v1/docs` - API documentation

**Terminal 2 - Start Frontend (React UI):**

```bash
npm run ui:dev
```

This starts the Vite development server. You should see:
```
VITE v6.4.1  ready in 308 ms

  ➜  Local:   http://localhost:3000/
```

The frontend:
- Serves HTML on `http://localhost:3000`
- Automatically proxies API calls from `/api/*` to the backend on port 8787
- Provides hot module reloading during development

**Open your browser to http://localhost:3000/**

**Terminal 3 - Ingest Sample Data:**

```bash
npm run ingest ./data/wikipedia
```

You should see:
```
Starting Wikipedia data ingestion...
Found 1 articles to ingest
✓ Ingested: Artificial Intelligence (Workflow: abc-123-def)
=== Ingestion Complete ===
Success: 1
```

### 8. Test the System

Open http://localhost:3000 in your browser.

Try asking:
- "What is artificial intelligence?"
- "When was AI founded?"
- "What are some applications of AI?"

You should see:
- The AI-generated answer
- Source citations with similarity scores
- Metadata about the query (latency, chunks retrieved)

## Troubleshooting

### Backend server not starting

If `npm run dev` fails with binding errors:

```bash
# Error: "In development, you should use a separate kv namespace..."
```

This usually means KV namespaces need to be configured for local mode. Check your `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "EMBEDDINGS_CACHE",
    "id": "YOUR_ID_HERE"
    // Note: Remove "remote": true for local development
  }
]
```

KV uses local simulation in dev mode, but retains the IDs for production.

### Frontend won't connect to backend

1. Verify both servers are running:
   - Backend: `curl http://localhost:8787/health` (should return JSON)
   - Frontend: Open browser to `http://localhost:3000` (should show HTML)

2. Check Vite proxy configuration in `ui/vite.config.ts`:
   ```typescript
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:8787',
         changeOrigin: true,
       },
     },
   }
   ```

3. Check browser console for errors (F12 → Console tab)

### "Database not found"

Make sure you ran migrations:
```bash
wrangler d1 migrations apply wikipedia-db --local
```

### "Vectorize index not found"

Vectorize requires a remote connection. Make sure you created the index:
```bash
wrangler vectorize create wikipedia-vectors --preset @cf/baai/bge-base-en-v1.5
```

### "R2 bucket not found"

Create the bucket:
```bash
wrangler r2 bucket create wikipedia-articles
```

### Workflow fails during ingestion

Check the Worker logs in Terminal 1. Common issues:
- Text splitting enabled but no content to split
- Invalid JSON in data files
- Missing required fields (title, content)

### Port already in use

If port 3000 or 8787 is already in use:

```bash
# Change Vite port in ui/vite.config.ts
npm run ui:dev -- --port 3001

# Change Wrangler port
wrangler dev --port 8788
```

Then update the proxy configuration in `ui/vite.config.ts` to match the new port.

## Next Steps

### Add More Articles

1. Place more Wikipedia JSON files in `data/wikipedia/`
2. Run the ingestion script again:
   ```bash
   npm run ingest ./data/wikipedia
   ```

### Deploy to Production

```bash
# First, run migrations on remote database
wrangler d1 migrations apply wikipedia-db --remote

# Deploy the Worker
npm run deploy:production

# Build the UI
npm run ui:build

# Deploy UI to Cloudflare Pages (or your preferred hosting)
```

### Monitor Performance

Check logs in the Cloudflare dashboard:
1. Go to Cloudflare Dashboard
2. Select your account
3. Click "Workers & Pages"
4. Click your worker
5. View logs and analytics

## Getting Help

- Check `README.md` for detailed documentation
- Review `docs/ARCHITECTURE.md` for system design
- Check the Cloudflare Workers documentation
- Open an issue (if this is a public repo)

## What's Next?

Once the basic RAG system is working, you can explore:

1. **Advanced Patterns** (Phase 2):
   - Implement reranking for better quality
   - Add refinement for complex questions
   - Build agentic search capabilities

2. **Hybrid Search**:
   - Combine vector search with keyword matching
   - Use D1's FTS5 for precise queries

3. **Performance Tuning**:
   - Enable caching
   - Implement streaming responses
   - Add adaptive top-K selection

4. **Production Hardening**:
   - Add authentication
   - Implement rate limiting
   - Set up monitoring and alerts

Happy building!
