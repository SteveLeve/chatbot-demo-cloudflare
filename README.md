# Cloudflare RAG Portfolio

Professional demonstration of Retrieval-Augmented Generation (RAG) patterns on Cloudflare Workers AI.

## Overview

This project showcases a production-grade RAG implementation using Cloudflare's edge computing platform, demonstrating how to build intelligent Q&A systems that combine semantic search with generative AI.

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

## Architecture

### Technology Stack

- **Runtime**: Cloudflare Workers (edge computing)
- **Framework**: Hono (lightweight web framework)
- **AI Models**:
  - Embeddings: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
  - Generation: `@cf/meta/llama-3.1-8b-instruct`
- **Storage**:
  - R2: Full Wikipedia articles
  - D1 (SQLite): Document metadata and text chunks
  - Vectorize: Semantic embeddings
  - KV: Caching (embeddings and query results)
- **UI**: React 18 + Vite + Tailwind CSS
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
├── src/
│   ├── index.ts                 # Main application (Hono routes)
│   ├── ingestion-workflow.ts   # Durable workflow for data ingestion
│   ├── patterns/
│   │   └── basic-rag.ts         # Basic RAG implementation
│   ├── utils/
│   │   ├── logger.ts            # Structured logging
│   │   ├── document-store.ts    # R2/D1/Vectorize abstraction
│   │   └── chunking.ts          # Text chunking utilities
│   └── types/
│       └── index.ts             # TypeScript definitions
├── migrations/
│   ├── 0001_create_documents_table.sql
│   ├── 0002_create_chunks_table.sql
│   └── 0003_create_fts_table.sql
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   └── QueryInterface.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── scripts/
│   └── ingest-wikipedia.ts      # Data ingestion script
├── data/
│   └── wikipedia/               # Wikipedia articles (JSON)
├── docs/
│   ├── ARCHITECTURE.md          # System architecture
│   └── spec/                    # Specifications
├── wrangler.jsonc               # Cloudflare Workers config
├── package.json
└── README.md
```

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

### Deploy to Production

```bash
# Deploy Worker
npm run deploy:production

# Build and deploy UI (to Cloudflare Pages or your hosting provider)
npm run ui:build
```

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

- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [RAG Architecture Guide](./docs/ARCHITECTURE.md)

## Contributing

This is a personal portfolio project demonstrating RAG patterns. Feel free to fork and adapt for your own learning!

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built on Cloudflare's edge platform
- Inspired by modern RAG architectures
- Wikipedia content under CC BY-SA license
