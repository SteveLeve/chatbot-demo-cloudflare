# Performance Optimization Roadmap

**Goal**: Reduce costs by 41% and improve latency by 82% for cached queries
**Target Completion**: 2-3 weeks
**Owner**: Backend & Platform Team

---

## Current Baseline

**Costs** (10,000 queries/month):
- Workers AI: $22.00
- Vectorize: $0.00 (Free tier)
- D1: $0.50
- KV: $1.00
- R2: $0.15
- Workflows: $0.25
- Observability: $3.00
- **Total**: $26.90/month

**Performance**:
- Average latency: 250ms
- P95 latency: 350ms
- Cache hit rate: 0%
- Cost per query: $0.002

---

## Target State

**Costs** (optimized):
- Workers AI: $11.00 (50% cached)
- AI Gateway: $0.00 (free caching)
- Other services: $4.90
- **Total**: $15.90/month (41% savings)

**Performance**:
- Average latency (cached): 45ms (82% improvement)
- Average latency (uncached): 245ms
- P95 latency: 280ms
- Cache hit rate: 40%
- Cost per query: $0.001

---

## Phase 1: Quick Wins (This Week)

### Issue #12: Enable Embedding Cache
**Priority**: HIGH (Biggest single optimization)
**Status**: 🔴 Not Started
**GitHub Issue**: [#12](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/12)

**Impact**:
- Latency: -80ms per cached query
- Cost: -30% on embedding compute
- ROI: Positive after 100 queries

**Checklist**:
- [ ] Implement `getCachedEmbedding()` function
- [ ] Implement `cacheEmbedding()` function
- [ ] Add SHA-256 hash for cache keys
- [ ] Set 7-day TTL for query embeddings
- [ ] Update `src/patterns/basic-rag.ts:64-72`
- [ ] Add cache hit/miss logging
- [ ] Monitor cache hit rate in dashboard
- [ ] Verify cost reduction after 1 week

**Implementation**:
```typescript
async function getCachedEmbedding(text: string, env: Env): Promise<number[] | null> {
  const cacheKey = `emb:${await hashText(text)}`;
  return await env.EMBEDDINGS_CACHE.get(cacheKey, 'json');
}

async function cacheEmbedding(text: string, embedding: number[], env: Env): Promise<void> {
  const cacheKey = `emb:${await hashText(text)}`;
  await env.EMBEDDINGS_CACHE.put(cacheKey, JSON.stringify(embedding), {
    expirationTtl: 7 * 24 * 60 * 60  // 7 days
  });
}
```

**Estimated Effort**: 2 hours
**Expected Savings**: $6.60/month + 80ms latency

---

### Issue #16: Implement AI Gateway
**Priority**: HIGH
**Status**: 🔴 Not Started
**GitHub Issue**: [#16](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/16)

**Impact**:
- Latency: -90% on cache hits
- Cost: -30% overall (free edge caching)
- Monitoring: Cost visibility dashboard

**Checklist**:
- [ ] Create AI Gateway in Cloudflare dashboard
- [ ] Copy gateway ID
- [ ] Add configuration to `wrangler.jsonc`:
  ```jsonc
  "ai_gateway": {
    "id": "your-gateway-id",
    "enabled": true,
    "cache": {
      "enabled": true,
      "ttl": 3600
    }
  }
  ```
- [ ] Test AI calls through gateway
- [ ] Verify caching working
- [ ] Monitor cache hit rate in dashboard
- [ ] Set up cost alerts

**Estimated Effort**: 30 minutes
**Expected Savings**: Additional $4-5/month + latency improvement

---

### Issue #13: Fix Sequential Chunk Insertion
**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#13](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/13)

**Impact**:
- Ingestion speed: 10x faster (2s → 200ms)
- Workflow reliability: Reduced timeout risk

**Checklist**:
- [ ] Update `src/utils/document-store.ts:202-219`
- [ ] Replace loop with D1 batch API
- [ ] Test with 100-chunk document
- [ ] Measure before/after timing
- [ ] Update workflow timeouts if needed

**Implementation**:
```typescript
async createChunks(chunks: Omit<TextChunk, 'createdAt'>[]): Promise<TextChunk[]> {
  const now = Date.now();
  const statements = chunks.map(chunk => ({
    query: `INSERT INTO chunks (id, document_id, text, chunk_index, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
    params: [chunk.id, chunk.documentId, chunk.text, chunk.chunkIndex,
             JSON.stringify(chunk.metadata), now]
  }));

  await this.env.DATABASE.batch(statements);
  return chunks.map(c => ({ ...c, createdAt: now }));
}
```

**Estimated Effort**: 1 hour
**Expected Improvement**: 10x faster document ingestion

---

## Phase 2: Reliability & Workflows (Week 2)

### Issue #14: Add Workflow Timeout Handling
**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#14](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/14)

**Checklist**:
- [ ] Create `withTimeout()` helper function
- [ ] Add 30-second timeout to embedding generation
- [ ] Add timeout to vector operations
- [ ] Add timeout to D1 operations
- [ ] Test with simulated delays
- [ ] Update workflow step configs

**Estimated Effort**: 1 hour

---

### Issue #15: Make Workflow Steps Idempotent
**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#15](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/15)

**Checklist**:
- [ ] Implement deterministic UUID generation
- [ ] Update document creation to use deterministic IDs
- [ ] Replace INSERT with INSERT OR REPLACE
- [ ] Update chunk creation with deterministic IDs
- [ ] Add delete-then-insert pattern for chunks
- [ ] Test retry scenarios
- [ ] Verify no duplicates created on retry

**Implementation**:
```typescript
// Deterministic UUID based on input
async function hashToUUID(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  // Convert to UUID format
  return uuidFromHash(hash);
}

// Usage
const docId = await hashToUUID(`doc:${articleId}`);
```

**Estimated Effort**: 2 hours

---

## Phase 3: Database Optimizations (Week 3)

### Issue #17: D1 Query Optimizations
**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#17](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/17)

**Checklist**:
- [ ] **JSON Parsing Optimization**
  - [ ] Update D1 queries to use `json()` function
  - [ ] Remove JSON.parse from loops
  - [ ] Test performance improvement
- [ ] **Add Composite Indexes**
  - [ ] Create `idx_chat_messages_session_created`
  - [ ] Create `idx_message_chunks_msg_rank`
  - [ ] Create `idx_chat_sessions_active` (partial index)
- [ ] **Add PRAGMA optimize**
  - [ ] Add to scheduled cron job (weekly)
  - [ ] Run initial optimization
  - [ ] Monitor query performance
- [ ] **Batch Write Operations**
  - [ ] Update chat logging to use batch
  - [ ] Combine message + chunk inserts
  - [ ] Test performance improvement

**Migration Script**:
```sql
-- New indexes
CREATE INDEX idx_chat_messages_session_created
  ON chat_messages(session_id, created_at DESC);

CREATE INDEX idx_message_chunks_msg_rank
  ON message_chunks(message_id, rank_position);

CREATE INDEX idx_chat_sessions_active
  ON chat_sessions(session_id)
  WHERE is_active = 1;

-- Optimize
PRAGMA optimize;
```

**Estimated Effort**: 1-2 hours
**Expected Improvement**: 10-20ms per query

---

## Phase 4: Advanced Optimizations (Future)

### Issue #20: Upgrade to BGE-Large Embedding Model
**Priority**: LOW
**Status**: 🔴 Not Started
**GitHub Issue**: [#20](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/20)

**Impact**:
- Quality: +10% retrieval accuracy
- Cost: +30% (more dimensions)
- Requires: Full re-indexing

**Approach**:
1. A/B test quality improvement first
2. If justified, create new Vectorize index (1024d)
3. Re-run ingestion workflow for all documents
4. Migrate queries to new index
5. Delete old index

**Estimated Effort**: 4-5 hours

---

### Issue #21: Implement LLM Reranking
**Priority**: LOW
**Status**: 🔴 Not Started
**GitHub Issue**: [#21](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/21)

**Impact**:
- Quality: +20-30% relevance
- Latency: +150-200ms
- Cost: +$0.0001 per query

**Approach**:
1. Fetch topK=10 candidates from vector search
2. Use LLM to score relevance (0-10)
3. Select top 3 for final generation
4. Measure quality improvement

**Estimated Effort**: 3 hours

---

## Progress Tracking

### Week 1 Goals
- [ ] Enable embedding cache (#12)
- [ ] Implement AI Gateway (#16)
- [ ] Fix chunk insertion (#13)

**Target**: 30% cost reduction, 70% latency improvement for cached

### Week 2 Goals
- [ ] Add workflow timeouts (#14)
- [ ] Make workflows idempotent (#15)

**Target**: Improved reliability, no duplicate data

### Week 3 Goals
- [ ] D1 query optimizations (#17)
- [ ] Add composite indexes
- [ ] Implement batch writes

**Target**: Additional 10-20ms latency reduction

---

## Cost & Performance Monitoring

**Metrics to Track**:
- Daily AI inference costs (Workers AI dashboard)
- Cache hit rates (embedding cache + AI Gateway)
- Average query latency (P50, P95, P99)
- Ingestion workflow duration
- D1 query efficiency ratio
- Total monthly spend

**Alerting**:
- Cost spike (>2x baseline)
- Cache hit rate drop (<20%)
- Latency spike (>2x baseline)

**Tools**:
- Cloudflare Analytics Dashboard
- Workers AI cost tracking
- Custom D1 analytics queries
- AI Gateway dashboard

---

## Success Criteria

**Phase 1 Complete** (End of Week 1):
- ✅ Embedding cache hit rate > 30%
- ✅ AI Gateway configured and caching
- ✅ Ingestion 5x faster minimum
- ✅ Cost reduced by 20% minimum

**Phase 2 Complete** (End of Week 2):
- ✅ No workflow timeouts in 1 week
- ✅ No duplicate documents on retry
- ✅ Workflow reliability > 99%

**Phase 3 Complete** (End of Week 3):
- ✅ D1 queries 10-20ms faster
- ✅ Query efficiency ratio > 0.8
- ✅ Total cost reduction > 35%
- ✅ Cached latency < 60ms

---

## ROI Analysis

**Investment**:
- Development time: 15-20 hours
- Testing time: 5 hours
- Total: ~25 hours

**Returns** (monthly):
- Cost savings: $11/month
- Performance improvement: 82% for cached queries
- User experience: Faster responses
- Scalability: 10x ingestion throughput

**Payback Period**: Immediate (first month)

---

**Last Updated**: 2026-01-17
**Next Review**: End of Week 1 (after Phase 1)
**Owner**: Backend Team
