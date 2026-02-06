# Cloudflare RAG Portfolio

Professional demonstration of Retrieval-Augmented Generation (RAG) patterns on Cloudflare Workers AI.

## Overview

This project showcases a production-grade RAG implementation using Cloudflare's edge computing platform, demonstrating how to build intelligent Q&A systems that combine semantic search with generative AI.

## Documentation

- Living docs are under `docs/` (see `docs/README.md` for the map).
- Current status and near-term work: `docs/status/now-next.md`.
- Decisions: `docs/decisions/` (ADRs).

### Current Features (Phase 1)

- **Basic Single-Turn RAG**: Query Wikipedia articles with AI-powered answers and source citations
- **Hybrid Storage Architecture**: R2 for documents, D1 for metadata/chunks, Vectorize for embeddings
- **Durable Ingestion**: Workflow-based article processing with automatic retry and observability
- **Modern React UI**: Interactive demo interface with Tailwind CSS
- **Production-Ready**: Structured logging, error handling, TypeScript throughout

### Planned Features (Phase 2)

- **Advanced RAG Patterns**:
  - Reranking: Improve result quality with multi-stage retrieval
  - Refinement: Iterative answer improvement with context expansion
  - Agentic Search: Question decomposition and multi-step reasoning
- **Hybrid Search**: Combine vector similarity with keyword matching (D1 FTS5)
- **Streaming Responses**: Real-time token delivery for better UX
- **Performance Optimizations**: Caching, batching, adaptive top-K selection

## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| **Local development** | `npm run dev` + `npm run ui:dev` | Two terminal windows |
| **Build frontend** | `npm run build` | Creates `./public/` |
| **Deploy to production** | `npm run deploy` | Single command, full deployment |
| **Run tests** | `npm test` | Backend tests |
| **Type checking** | `npm run cf-typegen` | Generate Cloudflare types |
| **Database migrations** | `wrangler d1 migrations create wikipedia-db <name>` | Then edit SQL file |
| **Apply migrations** | `wrangler d1 migrations apply wikipedia-db --local` | Or `--remote` for prod |
| **View Worker logs** | `wrangler tail --env production` | Real-time logs |

## Architecture

### Full-Stack Workers Deployment Model

```
┌────────────────────────────────────────────────┐
│   Cloudflare Workers (Single Deployment)       │
├────────────────────────────────────────────────┤
│  Static Assets Layer                           │
│  ├─ React SPA (built to ./public)              │
│  ├─ CSS, JavaScript, images                    │
│  └─ Served with smart caching                  │
├────────────────────────────────────────────────┤
│  Application Layer                             │
│  ├─ Hono API Framework                         │
│  ├─ RAG Logic & Vector Search                  │
│  ├─ Workflow Engine (Data Ingestion)           │
│  └─ Structured Logging & Error Handling        │
├────────────────────────────────────────────────┤
│  Bindings Layer                                │
│  ├─ D1: SQL Database (chunks, metadata)        │
│  ├─ Vectorize: Vector Search (embeddings)      │
│  ├─ R2: Object Storage (articles)              │
│  ├─ KV: Cache Layer (results)                  │
│  └─ AI: Workers AI (embedding & generation)    │
└────────────────────────────────────────────────┘
```

**Why Single Worker?**
- ✅ Single `wrangler deploy` command
- ✅ No CORS (same origin for frontend + API)
- ✅ Shared bindings (frontend can access D1, KV, R2 if needed)
- ✅ Better observability (Workers Logs, Tail Workers)
- ✅ Gradual rollouts & canary deployments
- ✅ Lower latency (everything on edge)

### Technology Stack

- **Runtime**: Cloudflare Workers (edge computing)
- **Framework**: Hono (lightweight web framework)
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Build Target**: Static assets served from Workers
- **AI Models**:
  - Embeddings: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
  - Generation: `@cf/meta/llama-3.1-8b-instruct`
- **Storage**:
  - R2: Full Wikipedia articles
  - D1 (SQLite): Document metadata and text chunks
  - Vectorize: Semantic embeddings
  - KV: Caching (embeddings and query results)
- **Language**: TypeScript (strict mode)

### Data Flow

```
User Query
    ↓
Generate Embedding (@cf/baai/bge-base-en-v1.5)
    ↓
Vector Similarity Search (Vectorize)
    ↓
Retrieve Chunks (D1)
    ↓
Build Context
    ↓
Generate Answer (@cf/meta/llama-3.1-8b-instruct)
    ↓
Return Answer + Citations
```

### Ingestion Pipeline (Workflow)

```
Wikipedia Article
    ↓
1. Store in R2
    ↓
2. Create Document Metadata (D1)
    ↓
3. Split into Chunks
    ↓
4. Store Chunks (D1)
    ↓
5. Generate Embeddings
    ↓
6. Insert Vectors (Vectorize)
    ↓
Complete
```

## Understanding This Project

### What Makes It Different?

This is a **full-stack Cloudflare Workers project** - everything (frontend + backend) runs on the edge in a single Worker:

- **Traditional approach**: Separate frontend and backend services (Cloudflare Pages + Worker = two deployments, CORS issues)
- **Modern approach** (this project): Single Worker serves both React UI and API (one deployment, no CORS, shared bindings)

### How It Works

1. **Local Development**: Two dev servers coordinate
   - Wrangler dev server (port 8787): Runs your Worker code
   - Vite dev server (port 3000): Runs React with proxy to Worker
   - They talk via proxy - transparent to you

2. **Production Deployment**: One unified deployment
   - `npm run build`: Builds React to `./public`
   - `npm run deploy`: Deploys Worker + static assets as one unit
   - Both frontend and API live at same URL

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

### Setup

1. **Clone and install dependencies**:

```bash
npm install
cd ui && npm install && cd ..
```

2. **Fetch Wikipedia data**:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Fetch ~10MB of Wikipedia articles
python scripts/fetch-wikipedia.py --size-mb 10
```

This will download articles from the `wikimedia/wikipedia` dataset and save them to `data/wikipedia/`.

3. **Create Cloudflare resources**:

```bash
# D1 Database
wrangler d1 create wikipedia-db

# Vectorize Index
wrangler vectorize create wikipedia-vectors --preset @cf/baai/bge-base-en-v1.5

# R2 Bucket
wrangler r2 bucket create wikipedia-articles

# KV Namespaces
wrangler kv namespace create EMBEDDINGS_CACHE
wrangler kv namespace create RAG_CACHE
```

4. **Update `wrangler.jsonc`** with the IDs from the commands above:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DATABASE",
      "database_id": "YOUR_D1_ID_HERE"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "EMBEDDINGS_CACHE",
      "id": "YOUR_KV_ID_HERE"
    },
    {
      "binding": "RAG_CACHE",
      "id": "YOUR_KV_ID_HERE"
    }
  ]
}
```

5. **Run database migrations**:

```bash
wrangler d1 migrations apply wikipedia-db --local
```

6. **Start local development**:

```bash
# Terminal 1: Start Worker
npm run dev

# Terminal 2: Start UI
npm run ui:dev

# Terminal 3: Ingest data (once Worker is running)
npm run ingest ./data/wikipedia
```

The ingestion process will upload articles to your local Worker using the Workflow API.

7. **Open the demo**:

Visit http://localhost:3000 to interact with the RAG system.

## Project Structure

```
.
├── src/                                 # Worker code
│   ├── index.ts                         # Main application (Hono routes)
│   ├── ingestion-workflow.ts           # Durable workflow for data ingestion
│   ├── patterns/
│   │   └── basic-rag.ts                 # Basic RAG implementation
│   ├── utils/
│   │   ├── logger.ts                    # Structured logging
│   │   ├── document-store.ts            # R2/D1/Vectorize abstraction
│   │   └── chunking.ts                  # Text chunking utilities
│   └── types/
│       └── index.ts                     # TypeScript definitions
├── ui/                                  # Frontend (React SPA)
│   ├── src/
│   │   ├── components/
│   │   │   └── QueryInterface.tsx
│   │   ├── App.tsx
│   │   ├── config.ts                    # Frontend config (API URL handling)
│   │   └── main.tsx
│   ├── vite.config.ts                   # Builds to ../public
│   └── package.json
├── public/                              # Built React app (generated by npm run build)
│   ├── index.html                       # Served by Workers
│   ├── assets/                          # CSS, JS bundles
│   └── ...                              # Other static assets
├── migrations/
│   ├── 0001_create_documents_table.sql
│   ├── 0002_create_chunks_table.sql
│   └── 0003_create_fts_table.sql
├── scripts/
│   └── ingest-wikipedia.ts              # Data ingestion script
├── data/
│   └── wikipedia/                       # Wikipedia articles (JSON)
├── docs/
│   ├── DEPLOYMENT.md                    # Deployment guide
│   ├── ARCHITECTURE.md                  # System architecture
│   └── spec/                            # Specifications
├── wrangler.jsonc                       # Cloudflare Workers config (includes assets)
├── package.json
├── tsconfig.json                        # TypeScript config
└── README.md
```

**Key Files:**
- `wrangler.jsonc`: Configures Worker to serve React app from `./public`
- `ui/vite.config.ts`: Builds React to `../public` (Worker's assets directory)
- `npm run build`: Builds React app to `./public`
- `npm run deploy`: Builds + applies migrations + deploys everything

## API Endpoints

### Query Endpoints

**GET /api/v1/query**

Query parameters:
- `q` (required): Question to answer
- `topK` (optional): Number of chunks to retrieve (default: 3)
- `minSimilarity` (optional): Minimum similarity threshold (0-1)

Example:
```bash
curl "http://localhost:8787/api/v1/query?q=What%20is%20AI?"
```

**POST /api/v1/query**

Request body:
```json
{
  "question": "What is artificial intelligence?",
  "topK": 3,
  "minSimilarity": 0.7
}
```

### Ingestion Endpoints

**POST /api/v1/ingest**

Request body:
```json
{
  "title": "Artificial Intelligence",
  "content": "AI is the simulation of human intelligence...",
  "metadata": {
    "categories": ["Computer Science"]
  }
}
```

**GET /api/v1/ingest/:workflowId**

Check ingestion workflow status.

## Development

### Local Development Setup

This project uses **two coordinated dev servers** during development:

```
┌─────────────────────────────────────────────┐
│  Browser: http://localhost:3000             │
│  (Vite React dev server with HMR)           │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │ /api/* requests    │
         │ (Proxied via Vite) │
         └──────────┬─────────┘
                    │
         ┌──────────▼──────────┐
         │ http://localhost:8787
         │ (Wrangler Dev Server)
         │
         │ - Worker + bindings
         │ - Static assets
         │ - Hono routes
         └────────────────────┘
```

**Backend (Port 8787)** - Worker + API:
```bash
npm run dev
```
Starts the Cloudflare Worker development environment with:
- Live reload on code changes
- API endpoints at `http://localhost:8787`
- All bindings (D1, Vectorize, R2, KV) configured locally
- Static asset serving (from `/public` if built)

**Frontend (Port 3000)** - React App:
```bash
npm run ui:dev
```
Starts the React Vite dev server with:
- Hot module reloading (HMR) for instant UI updates
- Automatic proxy to `http://localhost:8787` for `/api/*` requests
- Vite's dev server magic for fast development

**Setup**:
```bash
# Terminal 1: Start the Worker (serves API + static assets)
npm run dev

# Terminal 2: Start the UI dev server (with proxy to Worker)
npm run ui:dev

# Open http://localhost:3000 in your browser
```

The frontend automatically proxies API calls to the backend via Vite's `proxy` configuration in `ui/vite.config.ts`.

For more details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run cf-typegen  # Generate Cloudflare types
```

### Linting

```bash
cd ui && npm run lint
```

## Deployment

This project uses a **modern full-stack Workers architecture**. Both the frontend and backend are deployed together as a single Worker, eliminating separate deployments, CORS issues, and complexity.

### Quick Deploy

Deploy your full-stack app with a single command:

```bash
npm run deploy
```

This command:
1. Builds the React frontend to `./public`
2. Applies database migrations
3. Deploys both frontend + API to Cloudflare Workers

Your app will be live at: `https://cloudflare-rag-portfolio.your-subdomain.workers.dev`

### Why This Architecture?

**Single-Worker deployment** is modern best practice because:
- ✅ One deployment instead of managing multiple services
- ✅ No CORS issues (frontend and API share the same origin)
- ✅ Access to all Cloudflare features (Durable Objects, Email, etc.)
- ✅ Better observability with Workers Logs and Tail
- ✅ Gradual deployments and canary rollouts built-in
- ✅ This is Cloudflare's recommended approach moving forward

See: [Pages → Workers Migration Guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

### Detailed Instructions

For comprehensive deployment instructions, environment configuration, CI/CD setup, and troubleshooting, see:

**[📘 Complete Deployment Guide](docs/DEPLOYMENT.md)**

### Environment Variables

Production secrets (set via Wrangler):

```bash
# Optional: Use Anthropic Claude for higher quality responses
wrangler secret put ANTHROPIC_API_KEY --env production
```

## Performance

Expected latencies for basic RAG:
- Embedding generation: ~100-200ms
- Vector search: ~50-100ms
- Chunk retrieval: ~20-50ms
- Answer generation: ~500-800ms
- **Total**: ~800-1200ms

## Cost Estimation

For a 10-20MB Wikipedia dataset with 1000 queries/day:

- **Workers AI**: Free tier covers most usage
- **D1**: Free (under 5GB)
- **Vectorize**: Free tier (5M vectors)
- **R2**: $0.015/GB-month (~$0.30/month for 20MB)
- **KV**: Free tier adequate
- **Workers**: Free tier (100k requests/day)

**Estimated monthly cost**: < $1

## Learning Resources

### Official Cloudflare Documentation
- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

### Architecture & Best Practices
- [Pages → Workers Migration Guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) - Why we chose Workers
- [Full-Stack Development on Cloudflare Workers](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/) - Cloudflare's recommendation
- [RAG Architecture Guide](./docs/ARCHITECTURE.md) - This project's design
- [Deployment Guide](./docs/DEPLOYMENT.md) - Comprehensive deployment reference

### RAG & AI Concepts
- [Retrieval-Augmented Generation (RAG) Overview](https://en.wikipedia.org/wiki/Prompt_engineering#Retrieval-augmented_generation)
- [Vector Search Best Practices](https://developers.cloudflare.com/vectorize/)
- [Semantic Search with Embeddings](https://developers.cloudflare.com/workers-ai/)

## Contributing

This is a personal portfolio project demonstrating RAG patterns. Feel free to fork and adapt for your own learning!

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built on Cloudflare's edge platform
- Inspired by modern RAG architectures
- Wikipedia content under CC BY-SA license
