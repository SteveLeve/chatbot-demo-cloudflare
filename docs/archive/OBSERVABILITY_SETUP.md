# Observability Setup Guide (Archived)
*Archived snapshot (moved 2026-02-06). See `../roadmaps/observability.md` and issue #18 for current steps.*

**Goal**: Production-grade monitoring with tracing, structured logging, and alerting
**Status**: Basic observability enabled, missing advanced features
**Target Completion**: 2 weeks
**Owner**: DevOps & Platform Team

---

## Current State

**wrangler.jsonc** (lines 94-96):
```jsonc
"observability": {
  "enabled": true
}
```

**Status**: ✅ Basic observability enabled, ❌ Missing 2026 features

---

## Target State

**Full Observability Stack**:
- ✅ Structured JSON logging
- ✅ Distributed tracing (5% sampling)
- ✅ OpenTelemetry export to Honeycomb/Grafana
- ✅ Custom metrics and dashboards
- ✅ Alerting on critical thresholds
- ✅ Cost monitoring

---

## Phase 1: Structured Logging (Week 1)

### Issue #18: Enable Structured Logging
**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#18](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/18)

### Step 1.1: Configure JSON Logging

**Update wrangler.jsonc**:
```jsonc
{
  "observability": {
    "enabled": true,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 0.10  // 10% sampling (cost control)
    }
  }
}
```

**Checklist**:
- [ ] Update observability configuration
- [ ] Deploy configuration change
- [ ] Verify logs flowing to dashboard

**Cost**: ~$0.60 per million log events (first 10M free on Paid plan)

---

### Step 1.2: Implement JSON Log Format

**Update logger utility** (if exists) or create structured logging:
```typescript
// Structured logging helper
function logStructured(level: string, message: string, context: Record<string, any>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  }));
}

// Usage in RAG query
logStructured('info', 'RAG query started', {
  requestId: crypto.randomUUID(),
  question: query,
  sessionId,
  topK,
  startTime: Date.now()
});
```

**Checklist**:
- [ ] Create structured logging utility
- [ ] Update key operations to use structured logs:
  - [ ] RAG queries (start, end, errors)
  - [ ] Document ingestion (start, end, errors)
  - [ ] Chat logging (errors)
  - [ ] Workflow steps (start, end, duration)
- [ ] Include request IDs for correlation
- [ ] Add performance timers
- [ ] Test log output format

**Key Fields to Log**:
- `timestamp`: ISO 8601 format
- `level`: info, warn, error, debug
- `requestId`: Correlation ID
- `operation`: What's happening
- `duration_ms`: How long it took
- `userId` / `sessionId`: Who triggered it
- `success`: Boolean outcome
- `error`: Error details if failed

---

### Step 1.3: Add Request ID Propagation

**Implement request ID middleware**:
```typescript
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  const logger = createLogger({ requestId }, c.env.LOG_LEVEL);
  c.set('logger', logger);

  await next();
});
```

**Checklist**:
- [ ] Add request ID middleware
- [ ] Propagate request ID through all operations
- [ ] Include in all log messages
- [ ] Return in response headers (X-Request-ID)
- [ ] Test request ID flow

---

## Phase 2: Distributed Tracing (Week 1-2)

### Step 2.1: Enable Automatic Tracing

**Update wrangler.jsonc**:
```jsonc
{
  "observability": {
    "enabled": true,
    "traces": {
      "enabled": true,
      "head_sampling_rate": 0.05  // 5% sampling
    },
    "logs": {
      "enabled": true,
      "head_sampling_rate": 0.10
    }
  }
}
```

**What Gets Traced Automatically**:
- ✅ All `fetch()` calls (external APIs, subrequests)
- ✅ Binding interactions (D1, KV, R2, Vectorize, Workers AI)
- ✅ Handler lifecycle (request start/end, duration)
- ✅ Workflow steps (step start/success/failure)

**Checklist**:
- [ ] Enable tracing in configuration
- [ ] Deploy updated configuration
- [ ] Verify traces appearing in dashboard
- [ ] Review trace samples for coverage
- [ ] Adjust sampling rate if needed

**Cost**: ~$0.60 per million trace spans (first 10M free)

---

### Step 2.2: Configure OpenTelemetry Export

**Choose provider**: Honeycomb (recommended), Grafana, or Datadog

**For Honeycomb**:
```jsonc
{
  "observability": {
    "enabled": true,
    "traces": {
      "enabled": true,
      "head_sampling_rate": 0.05
    },
    "exporter": {
      "type": "otel-http",
      "endpoint": "https://api.honeycomb.io/v1/traces",
      "headers": {
        "x-honeycomb-team": "${HONEYCOMB_API_KEY}",
        "x-honeycomb-dataset": "rag-chatbot-prod"
      }
    }
  }
}
```

**Setup Steps**:
1. Create Honeycomb account (free tier available)
2. Generate API key
3. Store in Wrangler secrets:
   ```bash
   wrangler secret put HONEYCOMB_API_KEY
   ```
4. Update wrangler.jsonc with exporter config
5. Deploy
6. Verify traces appearing in Honeycomb

**Checklist**:
- [ ] Create observability platform account
- [ ] Generate and store API key
- [ ] Configure exporter in wrangler.jsonc
- [ ] Deploy configuration
- [ ] Verify traces exporting successfully
- [ ] Create initial dashboard in Honeycomb

---

### Step 2.3: Create Custom Spans (Optional)

**For business logic tracing**:
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('cloudflare-rag-portfolio');

export async function processQuery(query: string, env: Env) {
  return await tracer.startActiveSpan('rag-query', async (span) => {
    span.setAttribute('query.length', query.length);
    span.setAttribute('query.topK', topK);

    try {
      const result = await performRAG(query, env);
      span.setAttribute('result.chunks', result.chunks.length);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Checklist** (if implementing custom spans):
- [ ] Install @opentelemetry/api
- [ ] Create custom spans for key operations
- [ ] Add relevant attributes
- [ ] Handle errors properly
- [ ] Test span creation

---

## Phase 3: Dashboards & Metrics (Week 2)

### Step 3.1: Create Performance Dashboard

**Key Metrics to Track**:
1. **Request Volume**
   - Total requests per hour
   - Requests by endpoint
   - Success vs error rate

2. **Latency**
   - P50, P95, P99 response time
   - Breakdown by operation (embedding, vector search, LLM)
   - Slow queries (>2 seconds)

3. **Errors**
   - Error count and rate
   - Error types and frequency
   - Failed operations

4. **AI Performance**
   - Embedding generation time
   - LLM inference time
   - Workers AI costs (neurons consumed)

5. **Database**
   - D1 query count
   - Query efficiency (rows read/returned)
   - Slow queries (>100ms)

6. **Caching**
   - Embedding cache hit rate
   - RAG response cache hit rate
   - AI Gateway cache hit rate

**Checklist**:
- [ ] Create dashboard in chosen platform
- [ ] Add request volume panel
- [ ] Add latency percentiles panel
- [ ] Add error rate panel
- [ ] Add AI performance metrics
- [ ] Add database metrics
- [ ] Add cache hit rate tracking
- [ ] Add cost tracking panel
- [ ] Share dashboard with team

---

### Step 3.2: Custom Metrics with D1 Analytics

**Create analytics queries**:

**Daily Volume**:
```sql
SELECT
  DATE(created_at / 1000, 'unixepoch') as date,
  COUNT(*) as sessions,
  SUM(message_count) as total_messages,
  AVG(message_count) as avg_messages_per_session
FROM chat_sessions
WHERE created_at >= strftime('%s', 'now', '-30 days') * 1000
GROUP BY date
ORDER BY date DESC;
```

**Error Rate by Model**:
```sql
SELECT
  model_name,
  COUNT(*) as total,
  SUM(has_error) as errors,
  (SUM(has_error) * 100.0 / COUNT(*)) as error_rate
FROM chat_messages
WHERE role = 'assistant'
  AND created_at >= strftime('%s', 'now', '-7 days') * 1000
GROUP BY model_name;
```

**RAG Quality (Avg Similarity)**:
```sql
SELECT
  DATE(created_at / 1000, 'unixepoch') as date,
  AVG(similarity_score) as avg_similarity,
  MIN(similarity_score) as min_similarity,
  MAX(similarity_score) as max_similarity,
  COUNT(*) as queries
FROM message_chunks
WHERE created_at >= strftime('%s', 'now', '-30 days') * 1000
GROUP BY date
ORDER BY date DESC;
```

**Geographic Distribution**:
```sql
SELECT
  country,
  COUNT(*) as sessions,
  AVG(message_count) as avg_messages
FROM chat_sessions
WHERE created_at >= strftime('%s', 'now', '-7 days') * 1000
GROUP BY country
ORDER BY sessions DESC
LIMIT 20;
```

**Checklist**:
- [ ] Save analytics queries in documentation
- [ ] Create scheduled queries (if supported)
- [ ] Export to dashboard
- [ ] Set up weekly reports

---

## Phase 4: Alerting (Week 2)

### Step 4.1: Configure Critical Alerts

**Alert Thresholds**:

**1. High Error Rate**
- Metric: Error rate > 5%
- Window: Last 1 hour
- Severity: Critical
- Action: Page on-call engineer

**2. Slow Queries**
- Metric: P95 latency > 5 seconds
- Window: Last 10 minutes
- Severity: High
- Action: Notify backend team

**3. Cost Spike**
- Metric: Daily AI costs > 2x baseline
- Window: Last 24 hours
- Severity: High
- Action: Notify finance + backend

**4. Workflow Failures**
- Metric: Workflow failure rate > 5%
- Window: Last 1 hour
- Severity: High
- Action: Notify backend team

**5. Rate Limit Violations**
- Metric: 429 responses > 100/hour
- Window: Last 1 hour
- Severity: Medium
- Action: Log for review

**6. Database Issues**
- Metric: D1 error rate > 1%
- Window: Last 10 minutes
- Severity: Critical
- Action: Page on-call

**Checklist**:
- [ ] Configure error rate alert
- [ ] Configure latency alert
- [ ] Configure cost spike alert
- [ ] Configure workflow failure alert
- [ ] Configure rate limit alert
- [ ] Configure database alert
- [ ] Test alert delivery (email/Slack/PagerDuty)
- [ ] Document alert runbooks

---

### Step 4.2: Create Alert Runbooks

**For each alert, document**:
1. What the alert means
2. Common causes
3. Investigation steps
4. Resolution actions
5. Escalation path

**Example Runbook: High Error Rate Alert**

**Triggered**: Error rate > 5% for 1 hour

**Investigation Steps**:
1. Check Cloudflare dashboard for error details
2. Review recent logs for error patterns
3. Check if specific endpoint affected
4. Review recent deployments (last 24h)
5. Check external dependencies (Workers AI, D1)

**Common Causes**:
- Recent deployment introduced bug
- Dependency outage (Workers AI, D1)
- Input validation issues
- Rate limiting triggering errors

**Resolution**:
- If deployment issue: Rollback
- If dependency outage: Wait or fail gracefully
- If input issue: Add validation
- If rate limiting: Adjust limits or block abuser

**Escalation**: If unresolved in 30 min, page backend lead

**Checklist**:
- [ ] Create runbook for each alert
- [ ] Document in wiki/docs
- [ ] Train on-call team
- [ ] Test runbook procedures

---

## Phase 5: Cost Monitoring (Ongoing)

### Step 5.1: Track AI Costs

**Workers AI Cost Tracking**:
```typescript
// Track monthly neuron consumption
export async function getMonthlyAICost(env: Env): Promise<number> {
  // Query via GraphQL API or estimate from logs
  const neurons = await getMonthlyNeurons(env);
  const cost = (neurons / 1000) * 0.011;  // $0.011 per 1K neurons
  return cost;
}

// Alert if over budget
if (cost > 50) {  // $50 monthly budget
  await sendAlert(env, `Workers AI cost: $${cost.toFixed(2)}`);
}
```

**Checklist**:
- [ ] Set up cost tracking function
- [ ] Create monthly cost report
- [ ] Set cost alerts ($25, $50, $100 thresholds)
- [ ] Track cost per query
- [ ] Monitor cache effectiveness (cost reduction)

---

### Step 5.2: Optimize Based on Metrics

**Weekly Review**:
1. Review top cost drivers
2. Identify optimization opportunities
3. Check cache hit rates
4. Review error rates
5. Analyze slow queries

**Monthly Review**:
1. Full cost analysis
2. ROI of optimizations
3. Capacity planning
4. Performance trends

**Checklist**:
- [ ] Schedule weekly review meeting
- [ ] Create review template/checklist
- [ ] Document optimization decisions
- [ ] Track optimization impact

---

## Monitoring Checklists

### Daily (5 minutes)
- [ ] Check error rate in dashboard
- [ ] Review any active alerts
- [ ] Spot-check latency trends
- [ ] Verify scheduled jobs ran

### Weekly (30 minutes)
- [ ] Deep dive into error logs
- [ ] Analyze slow queries
- [ ] Review cache hit rates
- [ ] Check cost trends
- [ ] Review alert frequency

### Monthly (2 hours)
- [ ] Full metrics review
- [ ] Cost optimization analysis
- [ ] Capacity planning
- [ ] Dashboard refinement
- [ ] Update runbooks

---

## Success Criteria

**Phase 1 Complete** (Structured Logging):
- ✅ All logs in JSON format
- ✅ Request IDs propagated
- ✅ Key operations logged

**Phase 2 Complete** (Tracing):
- ✅ Traces exporting to platform
- ✅ 5% sampling configured
- ✅ Trace dashboard created

**Phase 3 Complete** (Dashboards):
- ✅ Performance dashboard live
- ✅ All key metrics tracked
- ✅ Team has access

**Phase 4 Complete** (Alerting):
- ✅ 6 critical alerts configured
- ✅ Runbooks documented
- ✅ Alert delivery tested

**Phase 5 Complete** (Cost Monitoring):
- ✅ Cost tracking automated
- ✅ Budget alerts configured
- ✅ Monthly reports generated

---

## Tools & Resources

**Recommended Platforms**:
1. **Honeycomb** - Best for distributed tracing
2. **Grafana Cloud** - Comprehensive monitoring
3. **Datadog** - Enterprise APM

**Cloudflare Native**:
- Workers Analytics Dashboard
- Workers Logs
- D1 Analytics
- AI Gateway Dashboard

**Cost**:
- Basic observability: Free (included with Workers)
- Advanced tracing: $0.60/million events (first 10M free)
- External platforms: $0-100/month depending on volume

---

## Next Steps

**This Week**:
1. [ ] Configure structured logging
2. [ ] Enable distributed tracing
3. [ ] Set up OpenTelemetry export

**Next Week**:
4. [ ] Create dashboards
5. [ ] Configure alerts
6. [ ] Write runbooks

**Ongoing**:
7. [ ] Monitor metrics daily
8. [ ] Optimize based on data
9. [ ] Refine alerts and dashboards

---

**Last Updated**: 2026-01-17
**Next Review**: After Phase 1 completion
**Owner**: DevOps + Backend Team
