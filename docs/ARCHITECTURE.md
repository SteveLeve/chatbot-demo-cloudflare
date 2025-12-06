# System Architecture

## Overview

This RAG system is built on Cloudflare's edge computing platform, leveraging Workers AI, Vectorize, D1, and R2 to create a production-grade question-answering system.

## Core Components

### 1. Workers (Compute Layer)

**Purpose**: Handle HTTP requests, orchestrate RAG pipeline, execute business logic

**Key Responsibilities**:
- Route incoming API requests
- Execute RAG query logic
- Coordinate between storage layers
- Generate responses

**Framework**: Hono (lightweight, edge-optimized)

**Deployment**: Global edge network (~300 cities)

### 2. Workers AI (Inference Layer)

**Models Used**:

1. **Embedding Model**: `@cf/baai/bge-base-en-v1.5`
   - Purpose: Convert text to 768-dimensional vectors
   - Use cases: Query embedding, document chunk embedding
   - Performance: ~100-200ms per request
   - Cost: Free tier included

2. **Text Generation**: `@cf/meta/llama-3.1-8b-instruct`
   - Purpose: Generate natural language answers
   - Context window: 128K tokens
   - Temperature: 0.2 (factual responses)
   - Performance: ~500-800ms per request

### 3. Vectorize (Vector Database)

**Purpose**: Semantic similarity search over embedded text chunks

**Configuration**:
- Preset: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
- Distance metric: Cosine similarity
- Capacity: 5M vectors (free tier)

**Query Pattern**:
```typescript
const results = await VECTOR_INDEX.query(queryEmbedding, {
  topK: 3,
  returnMetadata: true
});
```

**Metadata Schema**:
```typescript
{
  documentId: string,
  chunkId: string,
  chunkIndex: number,
  title: string
}
```

### 4. D1 (Relational Database)

**Purpose**: Store document metadata, text chunks, and relationships

**Schema**:

**documents** table:
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**chunks** table:
```sql
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

**chunks_fts** (FTS5 virtual table):
```sql
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  chunk_id UNINDEXED,
  text,
  title
);
```

**Indexes**:
- `idx_documents_article_id` on `documents(article_id)`
- `idx_chunks_document_id` on `chunks(document_id)`
- `idx_chunks_document_index` on `chunks(document_id, chunk_index)`

### 5. R2 (Object Storage)

**Purpose**: Store full Wikipedia articles for reference and retrieval

**Key Pattern**: `articles/{article_id}.json`

**Object Structure**:
```json
{
  "id": "uuid",
  "title": "Article Title",
  "content": "Full article text...",
  "metadata": {
    "categories": ["Category1", "Category2"],
    "wordCount": 5000
  },
  "createdAt": "2025-01-06T...",
  "updatedAt": "2025-01-06T..."
}
```

**Why R2?**:
- Store complete articles without size constraints
- Zero egress fees (cost-effective)
- Separation of hot (chunks in D1) and cold (archives in R2) data

### 6. KV (Caching Layer)

**Purpose**: Cache embeddings and query results for performance

**Namespaces**:

1. **EMBEDDINGS_CACHE**: Cache query embeddings
   - Key pattern: `embed:{sha256(text)}`
   - TTL: 24 hours
   - Reduces duplicate embedding generation

2. **RAG_CACHE**: Cache complete RAG results
   - Key pattern: `rag:{pattern}:{sha256(question)}`
   - TTL: 1 hour
   - Instant responses for repeated questions

### 7. Workflows (Orchestration)

**Purpose**: Durable, observable data ingestion pipeline

**IngestionWorkflow Steps**:

1. **store-article**: Upload article to R2
2. **create-document**: Insert metadata into D1
3. **split-text**: Chunk article content
4. **store-chunks**: Insert chunks into D1
5. **generate-embeddings**: Create vectors for chunks
6. **insert-vectors**: Upload to Vectorize

**Benefits**:
- Automatic retries on failure
- State persistence across steps
- Observable in Cloudflare dashboard
- No timeout limits (vs 30s Worker limit)

## Data Flow Diagrams

### RAG Query Flow

```
[User] --question--> [Worker]
                        |
                        v
              [Generate Embedding]
                 (Workers AI)
                        |
                        v
              [Vector Similarity Search]
                   (Vectorize)
                        |
                        v
              [Retrieve Chunk IDs] --top-K--> [Fetch Chunks]
                                                   (D1)
                        |
                        v
                   [Build Context]
                        |
                        v
              [Generate Answer with Context]
                   (Workers AI LLM)
                        |
                        v
              [Return Answer + Sources]
                        |
                        v
                     [User]
```

### Ingestion Flow

```
[Wikipedia Article] --> [Workflow Start]
                              |
                              v
                    [Store Article] --> R2
                              |
                              v
                    [Create Document] --> D1 (metadata)
                              |
                              v
                    [Split Text] --> [Chunks]
                              |
                              v
                    [Store Chunks] --> D1 (chunks table)
                              |
                              v
                [Generate Embeddings] --> Workers AI
                              |
                              v
                    [Insert Vectors] --> Vectorize
                              |
                              v
                        [Complete]
```

## Storage Decision Rationale

### Why R2 + D1 + Vectorize?

**R2 for Full Articles**:
- Pros: No size limits, zero egress costs, versioning support
- Cons: Not queryable
- Use case: Archive full Wikipedia articles

**D1 for Chunks & Metadata**:
- Pros: Relational model, SQL queries, FTS5 support, fast joins
- Cons: 10GB limit (acceptable for our use case)
- Use case: Store text chunks, enable hybrid search, metadata queries

**Vectorize for Embeddings**:
- Pros: Purpose-built for vectors, fast similarity search, metadata filtering
- Cons: No local development support
- Use case: Semantic search over document chunks

**Alternative Considered: KV-Only**
- Rejected because: No relational queries, no FTS, harder to maintain consistency

## RAG Pattern: Basic Single-Turn

### Algorithm

1. **Input Validation**
   - Check question length < MAX_QUERY_LENGTH
   - Sanitize input

2. **Embedding Generation**
   - Convert question to 768-dim vector
   - Cache result in KV (24h TTL)

3. **Vector Retrieval**
   - Query Vectorize with embedding
   - Retrieve top-K most similar chunks (default K=3)
   - Optional: Filter by minSimilarity threshold

4. **Chunk Fetching**
   - Batch fetch chunks from D1 using chunk IDs
   - Join with documents table for metadata
   - Maintain order by chunk_index

5. **Context Assembly**
   - Format chunks as numbered references: `[1] text`, `[2] text`, etc.
   - Build system prompt with instructions + context

6. **Answer Generation**
   - Send system prompt + question to LLM
   - Temperature: 0.2 (factual, deterministic)
   - Max tokens: 1024 (sufficient for detailed answers)

7. **Response Formatting**
   - Extract answer from LLM response
   - Build source citations with similarity scores
   - Return structured response

### System Prompt Template

```
You are a helpful AI assistant that answers questions based on provided context from Wikipedia articles.

IMPORTANT INSTRUCTIONS:
1. Answer using ONLY information from the provided context
2. If context doesn't contain enough information, say "I don't have enough information"
3. Always cite sources using reference numbers [1], [2], etc.
4. Be concise but comprehensive
5. Do not make up information or use knowledge outside the context

Context:
[1] {chunk 1 text}
[2] {chunk 2 text}
...

Remember: Only use the information provided in the context above.
```

## Text Chunking Strategy

### Configuration

- **Chunk Size**: 500 characters (balance between context and retrieval granularity)
- **Chunk Overlap**: 100 characters (20% overlap to preserve context across boundaries)
- **Separators**: `\n\n\n` → `\n\n` → `\n` → `. ` → ` ` (recursive splitting)

### Wikipedia-Specific Considerations

1. **Section Preservation**: Prefer splitting at section boundaries
2. **List Handling**: Keep list items together when possible
3. **Table Detection**: Avoid splitting tables (metadata: `hasTable: true`)
4. **Metadata Enrichment**: Store section headers, chunk position in chunk metadata

### Example

Input article (1500 chars) → 3 chunks:
- Chunk 0: Characters 0-500 (metadata: `{ chunkSize: 500, section: "Introduction" }`)
- Chunk 1: Characters 400-900 (overlap: 100, metadata: `{ chunkSize: 500, section: "History" }`)
- Chunk 2: Characters 800-1300 (overlap: 100, metadata: `{ chunkSize: 500, section: "Applications" }`)

## Performance Optimizations

### 1. Caching Strategy

**Embedding Cache** (KV):
- Key: SHA-256 hash of query text
- Benefit: Avoid duplicate embedding generation
- Hit rate: ~30-40% for common queries

**Query Result Cache** (KV):
- Key: Pattern + SHA-256 hash of question
- Benefit: Instant responses for repeated questions
- TTL: 1 hour (balance freshness vs. performance)

### 2. Batch Operations

**Database Queries**:
```typescript
// Bad: N queries
for (const id of chunkIds) {
  await db.get(id);
}

// Good: 1 query with IN clause
const placeholders = chunkIds.map(() => '?').join(',');
await db.prepare(`SELECT * FROM chunks WHERE id IN (${placeholders})`).bind(...chunkIds).all();
```

**Embedding Generation**:
```typescript
// Bad: N API calls
for (const text of texts) {
  await AI.run(model, { text: [text] });
}

// Good: 1 API call with batch
await AI.run(model, { text: texts });
```

### 3. Parallel Execution

```typescript
// Run independent operations in parallel
const [embeddings, documentMetadata] = await Promise.all([
  generateEmbedding(question),
  fetchRecentDocuments()
]);
```

## Observability

### Structured Logging

**Log Levels**:
- DEBUG: Detailed execution info
- INFO: Normal operations
- WARN: Recoverable issues
- ERROR: Failures requiring attention

**Performance Timers**:
```typescript
logger.startTimer('operation');
// ... do work ...
const duration = logger.endTimer('operation');
```

**Context Propagation**:
```typescript
const childLogger = logger.child({ requestId, userId });
childLogger.info('Processing request');
```

### Metrics Tracked

- Latency per operation (embedding, retrieval, generation)
- Cache hit rates
- Vector query result counts
- Error rates by type

## Security Considerations

### Input Validation

- Question length limits (prevent prompt injection via long inputs)
- Sanitization of user inputs
- Rate limiting (future: Durable Objects for distributed rate limiting)

### Prompt Injection Prevention

- System prompts explicitly constrain responses to context
- Guard mode: Refuse to answer when confidence is low
- Citation validation: Verify LLM cites only provided sources

### Access Control

- Current: Public read-only demo
- Future: User authentication, per-user knowledge bases, API keys

## Scalability

### Current Limits

- Vectorize: 5M vectors (sufficient for ~5000 Wikipedia articles at 1000 chunks each)
- D1: 10GB storage (sufficient for 10-20MB text dataset)
- R2: Unlimited storage (zero egress costs)
- Workers: 100k requests/day (free tier)

### Scaling Strategy

1. **Horizontal Scaling**: Workers auto-scale globally
2. **Data Sharding**: Use Vectorize namespaces for multi-tenancy
3. **Caching**: Aggressive KV caching reduces backend load
4. **Async Ingestion**: Workflows handle large-scale batch ingestion

## Future Enhancements (Phase 2)

### Advanced RAG Patterns

1. **Reranking**: Use `@cf/baai/bge-reranker-base` to re-score top-10 → top-3
2. **Refinement**: Iterative answer improvement with context expansion
3. **Agentic Search**: Question decomposition, multi-step reasoning
4. **Hybrid Search**: Combine Vectorize (semantic) + D1 FTS5 (keyword) with RRF

### Performance

1. **Streaming Responses**: Server-Sent Events for progressive rendering
2. **Adaptive TopK**: Increase K based on query complexity
3. **AI Gateway**: Centralized caching, rate limiting, analytics
4. **Prefix Caching**: Reduce LLM latency for repeated system prompts

### Quality

1. **Citation Validation**: Parse and verify LLM citations
2. **Confidence Scoring**: Return answer confidence based on similarity scores
3. **Hallucination Detection**: Post-processing to catch fabricated claims

## References

- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [RAG Best Practices](https://python.langchain.com/docs/use_cases/question_answering/)
