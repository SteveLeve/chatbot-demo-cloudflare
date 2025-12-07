# Cloudflare RAG Portfolio - Setup Guide

**Current Status**: Scaffolding complete, ready for Cloudflare resource setup

## Project Overview

A production-grade RAG (Retrieval-Augmented Generation) system built on Cloudflare's edge platform, demonstrating single-turn Q&A over Wikipedia articles with plans for advanced patterns (reranking, refinement, agentic search).

**Tech Stack**: Workers, Hono, Workers AI (bge-base-en-v1.5 + Llama 3.1), Vectorize, D1, R2, KV, React + Tailwind

## What's Built ✅

### Core Components
- **Basic RAG pattern** (`src/patterns/basic-rag.ts`): Query → Embedding → Vector search → LLM generation
- **Ingestion workflow** (`src/ingestion-workflow.ts`): 6-step durable pipeline (R2 → D1 → chunks → embeddings → Vectorize)
- **Document store** (`src/utils/document-store.ts`): Abstraction for R2/D1/Vectorize operations
- **API endpoints**: `/api/v1/query`, `/api/v1/ingest`, `/api/v1/docs`
- **React UI** (`ui/`): Demo interface with source citations and metrics

### Data Pipeline
- **Fetch utility** (`scripts/fetch-wikipedia.py`): Downloads Wikipedia from `wikimedia/wikipedia`
  - Configurable: `--size-mb 10` or `--articles 2000`
  - Filters: Removes articles < 500 chars
  - Output: Individual JSON files in `data/wikipedia/`
- **Ingestion script** (`scripts/ingest-wikipedia.ts`): Uploads articles to Worker via HTTP

### Infrastructure
- **3 D1 migrations**: documents, chunks, FTS5 tables
- **TypeScript**: Strict mode throughout with comprehensive types
- **Logging**: Structured logging with performance timers
- **Caching**: KV strategy for embeddings + query results

## File Structure (Key Files)

```
src/
├── index.ts                    # Main Hono app with routes
├── ingestion-workflow.ts       # Durable workflow for data ingestion
├── patterns/basic-rag.ts       # Basic single-turn RAG implementation
├── utils/
│   ├── logger.ts              # Structured logging
│   ├── document-store.ts      # R2/D1/Vectorize abstraction
│   └── chunking.ts            # Text splitting utilities
└── types/index.ts             # All TypeScript definitions

migrations/
├── 0001_create_documents_table.sql
├── 0002_create_chunks_table.sql
└── 0003_create_fts_table.sql

scripts/
├── fetch-wikipedia.py         # Data localization utility
└── ingest-wikipedia.ts        # Upload to Worker

ui/                            # React demo app
docs/                          # Architecture + guides
```

## Next Steps: Cloudflare Setup

### 1. Setup Python Environment (5 min)

**Best Practice**: Use a virtual environment to isolate Python dependencies.

```bash
# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate  # On Linux/macOS
# .venv\Scripts\activate   # On Windows

# Install Python dependencies
pip install -r requirements.txt
```

**Note**: Your terminal prompt should show `(.venv)` when the virtual environment is active. To deactivate later, run `deactivate`.

### 2. Fetch Wikipedia Data (10 min)

```bash
# Ensure virtual environment is active (you should see (venv) in prompt)
# Download ~10MB of Wikipedia articles (~2000 articles)
python scripts/fetch-wikipedia.py --size-mb 10

# Alternative: Use npm shortcut (automatically uses venv if available)
npm run fetch-data
```

**Output**: ~2000 JSON files in `data/wikipedia/` + `_fetch_metadata.json`

### 3. Install Node Dependencies (2 min)

```bash
npm install
cd ui && npm install && cd ..
```

### 4. Authenticate with Cloudflare (1 min)

```bash
wrangler login
```

### 5. Create Cloudflare Resources (5 min)

Run these commands and **save the IDs returned**:

```bash
# D1 Database
wrangler d1 create wikipedia-db
# → Note the database_id

# Vectorize Index
wrangler vectorize create wikipedia-vectors --preset @cf/baai/bge-base-en-v1.5
# → Index created (name: wikipedia-vectors)

# R2 Bucket
wrangler r2 bucket create wikipedia-articles
# → Bucket created

# KV Namespaces
wrangler kv:namespace create EMBEDDINGS_CACHE
# → Note the id

wrangler kv:namespace create RAG_CACHE
# → Note the id
```

### 6. Update Configuration (3 min)

Edit `wrangler.jsonc` and replace placeholders:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DATABASE",
      "database_name": "wikipedia-db",
      "database_id": "PASTE_D1_ID_HERE"  // From step 4
    }
  ],
  "kv_namespaces": [
    {
      "binding": "EMBEDDINGS_CACHE",
      "id": "PASTE_EMBEDDINGS_KV_ID_HERE"  // From step 4
    },
    {
      "binding": "RAG_CACHE",
      "id": "PASTE_RAG_KV_ID_HERE"  // From step 4
    }
  ]
}
```

### 7. Run Database Migrations (1 min)

```bash
# Local database (for development)
wrangler d1 migrations apply wikipedia-db --local

# Remote database (for production, later)
wrangler d1 migrations apply wikipedia-db --remote
```

Expected output: `✅ Successfully applied 3 migrations.`

### 8. Start Development (2 min)

Open 3 terminals:

```bash
# Terminal 1: Start Worker
npm run dev
# Wait for: Ready on http://localhost:8787

# Terminal 2: Start UI
npm run ui:dev
# Wait for: Local: http://localhost:3000

# Terminal 3: Ingest data (once Worker is running)
npm run ingest ./data/wikipedia
# Watch for: ✓ Ingested: [Article Title] (Workflow: ...)
```

### 9. Test the System (2 min)

1. Open http://localhost:3000
2. Ask: "What is artificial intelligence?"
3. Verify:
   - Answer appears with source citations
   - Similarity scores shown
   - Latency metrics displayed

## Architecture Quick Reference

### Data Flow (Query)
```
User Question
  → Generate Embedding (bge-base-en-v1.5)
  → Vector Search (Vectorize, top-K=3)
  → Fetch Chunks (D1)
  → Build Context
  → Generate Answer (Llama 3.1 8B)
  → Return Answer + Sources
```

### Data Flow (Ingestion)
```
Wikipedia Article
  → Store in R2 (full text)
  → Create Document (D1 metadata)
  → Split into Chunks (500 chars, 100 overlap)
  → Store Chunks (D1)
  → Generate Embeddings (batch)
  → Insert Vectors (Vectorize)
```

### Storage Strategy
- **R2**: Full Wikipedia articles (blob storage)
- **D1**: Document metadata + text chunks (queryable)
- **Vectorize**: 768-dim embeddings (semantic search)
- **KV**: Caching layer (embeddings + results)

## Configuration Reference

### Environment Variables (`wrangler.jsonc`)
```jsonc
"vars": {
  "ENVIRONMENT": "development",
  "LOG_LEVEL": "INFO",
  "ENABLE_TEXT_SPLITTING": true,
  "DEFAULT_CHUNK_SIZE": 500,
  "DEFAULT_CHUNK_OVERLAP": 100,
  "DEFAULT_TOP_K": 3,
  "MAX_QUERY_LENGTH": 500
}
```

### Models Used
- **Embeddings**: `@cf/baai/bge-base-en-v1.5` (768 dimensions, cosine similarity)
- **Generation**: `@cf/meta/llama-3.1-8b-instruct` (128K context, temp 0.2)

## Troubleshooting

### "Database not found"
```bash
wrangler d1 migrations apply wikipedia-db --local
```

### "Vectorize index not found"
Check `wrangler.jsonc` has correct binding name: `wikipedia-vectors`

### "R2 bucket not found"
```bash
wrangler r2 bucket create wikipedia-articles
```

### Ingestion workflow fails
- Check Worker is running (`npm run dev`)
- Verify data files exist in `data/wikipedia/`
- Check Worker logs in Terminal 1

### CORS errors in browser
- Ensure both Worker (8787) and UI (3000) are running
- Check proxy in `ui/vite.config.ts`

## Useful Commands

```bash
# Data management
npm run fetch-data              # Fetch 10MB Wikipedia
npm run fetch-data:quick        # Fetch 5MB (faster)
npm run fetch-data:large        # Fetch 20MB (more data)

# Development
npm run dev                     # Start Worker (localhost:8787)
npm run ui:dev                  # Start UI (localhost:3000)
npm run ingest ./data/wikipedia # Upload articles

# Database
npm run db:migrate              # Apply migrations (local)
npm run db:migrate:remote       # Apply migrations (remote)

# Deployment
npm run deploy:production       # Deploy to Cloudflare
```

## Success Criteria

After completing setup, you should be able to:
- ✅ Ask questions via UI and get AI-generated answers
- ✅ See source citations with similarity scores
- ✅ View performance metrics (latency, chunks retrieved)
- ✅ Ingest new Wikipedia articles
- ✅ Check workflow status in Cloudflare dashboard

## What's Next (Phase 2)

After validating basic RAG works:
1. Implement reranking pattern
2. Add refinement (iterative improvement)
3. Build agentic search (question decomposition)
4. Add hybrid search (vector + keyword)
5. Streaming responses
6. Performance optimizations

## Resources

- **Docs**: `docs/ARCHITECTURE.md` - Deep dive into system design
- **Quick Start**: `docs/QUICKSTART.md` - Step-by-step guide
- **Status**: `docs/PROJECT_STATUS.md` - Current state + roadmap
- **Cloudflare Docs**: https://developers.cloudflare.com/workers-ai/

---

**Ready to proceed?** Start with Step 1 (Fetch Wikipedia Data) and work through sequentially.
