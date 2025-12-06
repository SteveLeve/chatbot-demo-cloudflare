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

### 6. Prepare Sample Data

Create a sample Wikipedia article in `data/wikipedia/sample.json`:

```json
{
  "title": "Artificial Intelligence",
  "content": "Artificial intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction. Particular applications of AI include expert systems, natural language processing, speech recognition, and machine vision.\n\nAI was founded as an academic discipline in 1956, and in the years since has experienced several waves of optimism, followed by disappointment and the loss of funding (known as an 'AI winter'), followed by new approaches, success, and renewed funding. For most of its history, AI research has been divided into subfields that often fail to communicate with each other.",
  "metadata": {
    "categories": ["Computer Science", "Technology", "Artificial Intelligence"],
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence"
  }
}
```

### 7. Start Development Servers

**Terminal 1 - Start Worker:**

```bash
npm run dev
```

Wait for:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**Terminal 2 - Start UI:**

```bash
npm run ui:dev
```

Wait for:
```
  VITE v6.0.7  ready in 500 ms

  ➜  Local:   http://localhost:3000/
```

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

### CORS errors in browser

Make sure both the Worker (port 8787) and UI (port 3000) are running.

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
