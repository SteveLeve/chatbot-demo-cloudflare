# GDPR/CCPA Compliance Roadmap (Archived)
*Archived snapshot (moved 2026-02-06). See `../roadmaps/compliance.md` for current summary and GitHub issue #19 for active work.*

**Goal**: Full privacy compliance for user data handling
**Status**: Foundational privacy features implemented, missing user rights endpoints
**Target Completion**: 1 month
**Owner**: Privacy Team + Backend

---

## Current Privacy Posture

### ✅ Implemented
- IP address hashing (SHA-256 with salt) ⚠️ **Salt needs fixing (Issue #6)**
- 90-day data retention policy (schema configured)
- Minimal data collection (no PII beyond IP hash)
- FOREIGN KEY cascades for automatic cleanup
- Privacy-conscious logging

### ❌ Missing
- User data access endpoint (GDPR Article 15)
- User data deletion endpoint (GDPR Article 17)
- User data portability endpoint (GDPR Article 20)
- Opt-out mechanism (CCPA)
- Automated retention cleanup (cron job needs implementation)
- Privacy policy documentation
- Cookie consent (if using cookies)

---

## GDPR Requirements

### Article 15: Right of Access

**Requirement**: Users can request a copy of their personal data.

**Data Collected**:
- Hashed IP address (SHA-256)
- Session ID (random UUID)
- User agent string
- Geographic location (country, region, city)
- Chat messages and interactions
- Document chunks retrieved (RAG audit trail)
- Timestamps

**Implementation Needed**: Export endpoint returning user's data in JSON format.

---

### Article 17: Right to Erasure (Right to be Forgotten)

**Requirement**: Users can request deletion of their personal data.

**Data to Delete**:
- Chat sessions (cascades to messages and chunks)
- Audit logs referencing session
- Any cached data

**Implementation Needed**: Deletion endpoint with cascade verification.

---

### Article 20: Right to Data Portability

**Requirement**: Users can receive their data in machine-readable format.

**Format**: JSON export of all user data.

**Implementation Needed**: JSON export functionality.

---

## CCPA Requirements

### Right to Know

**Requirement**: Disclose categories of personal information collected.

**Categories Collected**:
1. **Identifiers**: Hashed IP, session ID, user agent
2. **Geolocation**: Country, region, city (approximate)
3. **Internet Activity**: Chat messages, query timestamps, AI interactions
4. **Inferences**: Document preferences derived from RAG usage

**Implementation Needed**: Privacy policy documentation.

---

### Right to Delete

**Requirement**: Users can request deletion (similar to GDPR Article 17).

**Implementation**: Same as GDPR deletion endpoint.

---

### Right to Opt-Out of Sale

**Requirement**: Disclose if data is sold and allow opt-out.

**Status**: Data is NOT sold. Need disclosure statement.

**Implementation**: Add "Do Not Sell" disclosure to responses.

---

## Issue #19: Implement Compliance Endpoints

**Priority**: MEDIUM
**Status**: 🔴 Not Started
**GitHub Issue**: [#19](https://github.com/SteveLeve/chatbot-demo-cloudflare/issues/19)

### Phase 1: Data Access Endpoint (Week 1)

**Endpoint**: `GET /api/privacy/export`

**Implementation**:
```typescript
// src/routes/privacy.ts

export async function exportUserData(
  sessionId: string,
  env: Env
): Promise<UserDataExport> {
  // Fetch session data
  const session = await env.DATABASE.prepare(`
    SELECT session_id, created_at, expires_at, country, region, city,
           message_count, is_active
    FROM chat_sessions
    WHERE session_id = ?
  `).bind(sessionId).first();

  if (!session) {
    throw new Error('Session not found');
  }

  // Fetch messages
  const messages = await env.DATABASE.prepare(`
    SELECT id, role, content, created_at, model_name, has_error
    FROM chat_messages
    WHERE session_id = (SELECT id FROM chat_sessions WHERE session_id = ?)
    ORDER BY created_at ASC
  `).bind(sessionId).all();

  // Fetch RAG chunks (audit trail)
  const chunks = await env.DATABASE.prepare(`
    SELECT mc.chunk_text, mc.similarity_score, mc.document_title,
           mc.rank_position, mc.created_at
    FROM message_chunks mc
    JOIN chat_messages cm ON mc.message_id = cm.id
    WHERE cm.session_id = (SELECT id FROM chat_sessions WHERE session_id = ?)
    ORDER BY mc.created_at ASC
  `).bind(sessionId).all();

  return {
    request_date: new Date().toISOString(),
    session: {
      id: session.session_id,
      created_at: new Date(session.created_at).toISOString(),
      expires_at: new Date(session.expires_at).toISOString(),
      location: {
        country: session.country,
        region: session.region,
        city: session.city
      },
      message_count: session.message_count,
      is_active: session.is_active === 1
    },
    messages: messages.results.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.created_at).toISOString(),
      model: m.model_name,
      had_error: m.has_error === 1
    })),
    retrieved_context: chunks.results.map(c => ({
      chunk_text: c.chunk_text,
      similarity_score: c.similarity_score,
      document_title: c.document_title,
      rank: c.rank_position,
      timestamp: new Date(c.created_at).toISOString()
    })),
    metadata: {
      data_categories: [
        'identifiers',
        'geolocation',
        'internet_activity',
        'inferences'
      ],
      retention_period: '90 days',
      ip_address_handling: 'SHA-256 hashed with salt (not reversible)'
    }
  };
}

// Route handler
app.get('/api/privacy/export', async (c) => {
  const sessionId = c.req.header('X-Session-ID');

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400);
  }

  try {
    const data = await exportUserData(sessionId, c.env);
    return c.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="chat-data-${sessionId}.json"`
      }
    });
  } catch (error) {
    return c.json({ error: 'Data export failed' }, 500);
  }
});
```

**Checklist**:
- [ ] Implement `exportUserData()` function
- [ ] Add `/api/privacy/export` route
- [ ] Handle missing session gracefully
- [ ] Return data in JSON format
- [ ] Add download headers
- [ ] Test with sample session
- [ ] Document API endpoint
- [ ] Add rate limiting (prevent abuse)

**Estimated Effort**: 2 hours

---

### Phase 2: Data Deletion Endpoint (Week 2)

**Endpoint**: `DELETE /api/privacy/delete`

**Implementation**:
```typescript
// src/routes/privacy.ts

export async function deleteUserData(
  sessionId: string,
  env: Env
): Promise<void> {
  // Verify session exists
  const session = await env.DATABASE.prepare(`
    SELECT id FROM chat_sessions WHERE session_id = ?
  `).bind(sessionId).first();

  if (!session) {
    throw new Error('Session not found');
  }

  // Delete session (cascades to messages and chunks via FOREIGN KEY)
  await env.DATABASE.prepare(`
    DELETE FROM chat_sessions WHERE session_id = ?
  `).bind(sessionId).run();

  // Log deletion for audit (required for compliance)
  await env.DATABASE.prepare(`
    INSERT INTO deletion_log (session_id, deleted_at, reason)
    VALUES (?, ?, 'user_request')
  `).bind(sessionId, Date.now()).run();

  // Clear any cached data (if applicable)
  // await env.SESSION_CACHE.delete(sessionId);
}

// Route handler
app.delete('/api/privacy/delete', async (c) => {
  const sessionId = c.req.header('X-Session-ID');

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400);
  }

  try {
    await deleteUserData(sessionId, c.env);
    return c.json({
      message: 'Your data has been permanently deleted',
      session_id: sessionId,
      deleted_at: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ error: 'Data deletion failed' }, 500);
  }
});
```

**Additional Schema** (deletion audit log):
```sql
-- migrations/0006_add_deletion_log.sql
CREATE TABLE IF NOT EXISTS deletion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_deletion_log_deleted_at ON deletion_log(deleted_at);
```

**Checklist**:
- [ ] Create deletion_log table migration
- [ ] Implement `deleteUserData()` function
- [ ] Add `/api/privacy/delete` route
- [ ] Verify cascade deletion works (test in dev)
- [ ] Log deletion for audit trail
- [ ] Clear cached data (if any)
- [ ] Return confirmation response
- [ ] Test with sample session
- [ ] Verify data actually deleted in DB
- [ ] Document API endpoint
- [ ] Add rate limiting

**Estimated Effort**: 2 hours

---

### Phase 3: Opt-Out Mechanism (Week 3)

**Endpoint**: `POST /api/privacy/opt-out`

**Implementation**:
```typescript
// src/routes/privacy.ts

export async function optOutOfLogging(
  sessionId: string,
  env: Env
): Promise<void> {
  // Add opt-out flag to session (requires schema update)
  await env.DATABASE.prepare(`
    UPDATE chat_sessions
    SET logging_enabled = 0,
        updated_at = ?
    WHERE session_id = ?
  `).bind(Date.now(), sessionId).run();
}

// Route handler
app.post('/api/privacy/opt-out', async (c) => {
  const sessionId = c.req.header('X-Session-ID');

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400);
  }

  try {
    await optOutOfLogging(sessionId, c.env);
    return c.json({
      message: 'You have opted out of data collection',
      session_id: sessionId,
      effective_at: new Date().toISOString(),
      note: 'Future interactions will not be logged'
    });
  } catch (error) {
    return c.json({ error: 'Opt-out failed' }, 500);
  }
});
```

**Schema Update**:
```sql
-- migrations/0007_add_logging_enabled.sql
ALTER TABLE chat_sessions ADD COLUMN logging_enabled INTEGER DEFAULT 1;
CREATE INDEX idx_chat_sessions_logging_enabled ON chat_sessions(logging_enabled);
```

**Update Chat Logger** to respect opt-out:
```typescript
// src/utils/chat-logger.ts

async initializeSession(): Promise<void> {
  // Check if session exists and is opted out
  const existing = await this.env.DATABASE.prepare(`
    SELECT logging_enabled FROM chat_sessions WHERE session_id = ?
  `).bind(this.sessionId).first();

  if (existing && existing.logging_enabled === 0) {
    this.loggingEnabled = false;
    this.logger.info('Session opted out of logging');
    return;
  }

  // Continue with normal initialization...
}
```

**Checklist**:
- [ ] Add logging_enabled column to schema
- [ ] Implement `optOutOfLogging()` function
- [ ] Add `/api/privacy/opt-out` route
- [ ] Update chat-logger to respect flag
- [ ] Test opt-out functionality
- [ ] Verify no logs created after opt-out
- [ ] Document API endpoint
- [ ] Add frontend UI for opt-out (optional)

**Estimated Effort**: 2 hours

---

## Phase 4: Automated Data Retention (Week 3-4)

### Issue: Implement Retention Cleanup Cron

**Current State**: 90-day retention in schema, but no cleanup job.

**Implementation**:
```typescript
// src/scheduled/cleanup.ts

export async function cleanupExpiredData(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const now = Date.now();

  // Delete expired sessions (and cascading data)
  const result = await env.DATABASE.prepare(`
    DELETE FROM chat_sessions WHERE expires_at < ?
  `).bind(now).run();

  console.log(JSON.stringify({
    level: 'info',
    event: 'cleanup_completed',
    sessions_deleted: result.meta?.changes || 0,
    timestamp: new Date().toISOString()
  }));

  // Vacuum database monthly (first day of month)
  if (new Date().getDate() === 1) {
    await env.DATABASE.prepare('VACUUM').run();
    console.log(JSON.stringify({
      level: 'info',
      event: 'database_vacuumed',
      timestamp: new Date().toISOString()
    }));
  }
}

// Register in index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '0 2 * * *':  // Daily at 2 AM UTC
        await cleanupExpiredData(env, ctx);
        break;
    }
  }
};
```

**Checklist**:
- [ ] Implement cleanup function
- [ ] Verify cron schedule in wrangler.jsonc (line 29)
- [ ] Add logging for audit trail
- [ ] Add VACUUM for monthly cleanup
- [ ] Test cleanup logic in dev
- [ ] Deploy and verify first run
- [ ] Monitor cleanup execution
- [ ] Document retention policy

**Estimated Effort**: 1 hour

---

## Phase 5: Privacy Documentation (Week 4)

### Privacy Policy Requirements

**Must Document**:
1. **What data we collect**
   - Hashed IP addresses
   - Session IDs
   - Geographic location (country/region/city)
   - Chat messages and interactions
   - User agent strings
   - Document retrieval patterns

2. **Why we collect it**
   - Service operation (chat functionality)
   - Analytics and improvement
   - Abuse prevention
   - Performance optimization

3. **How we protect it**
   - IP hashing (irreversible)
   - 90-day retention limit
   - Encryption in transit (TLS)
   - Access controls
   - Cloudflare security measures

4. **User rights**
   - Right to access (export data)
   - Right to deletion
   - Right to opt-out
   - How to exercise rights

5. **Data sharing**
   - No data sold to third parties
   - Cloudflare as data processor
   - Workers AI processing (within Cloudflare)

6. **International transfers**
   - Data stored in Cloudflare global network
   - GDPR compliance measures

7. **Contact information**
   - Privacy contact email
   - Data protection officer (if applicable)

**Checklist**:
- [ ] Draft privacy policy
- [ ] Review with legal team
- [ ] Publish on website
- [ ] Add link to chat interface
- [ ] Implement cookie consent (if needed)
- [ ] Document data processing agreements
- [ ] Update terms of service

**Estimated Effort**: 4-6 hours (depending on legal review)

---

## User Consent Flow

### Initial Visit
1. Display privacy notice with link to full policy
2. Obtain consent for data collection
3. Store consent flag in session
4. Allow opt-out at any time

### Returning Users
1. Check for existing consent
2. Re-prompt if policy updated
3. Honor opt-out preferences

**Implementation** (frontend):
```typescript
// Show consent banner on first visit
if (!localStorage.getItem('privacy-consent')) {
  showConsentBanner({
    message: 'We use hashed IPs and anonymous data to improve our service.',
    privacyPolicyLink: '/privacy',
    onAccept: () => {
      localStorage.setItem('privacy-consent', 'true');
      localStorage.setItem('privacy-consent-date', new Date().toISOString());
    },
    onOptOut: () => {
      fetch('/api/privacy/opt-out', {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId }
      });
      localStorage.setItem('privacy-consent', 'opt-out');
    }
  });
}
```

**Checklist**:
- [ ] Implement consent banner (frontend)
- [ ] Add privacy policy page
- [ ] Implement opt-out UI
- [ ] Store consent preferences
- [ ] Test consent flow
- [ ] Add cookie notice (if using cookies)

**Estimated Effort**: 3-4 hours

---

## Compliance Testing

### Test Scenarios

**1. Data Export Test**
```bash
# Request data export
SESSION_ID="test-session-123"
curl https://cloudflare-rag-demo.stevenleve.com/api/privacy/export \
  -H "X-Session-ID: $SESSION_ID" \
  -o export.json

# Verify all expected data present
jq '.session, .messages, .retrieved_context' export.json
```

**2. Data Deletion Test**
```bash
# Delete user data
curl -X DELETE https://cloudflare-rag-demo.stevenleve.com/api/privacy/delete \
  -H "X-Session-ID: $SESSION_ID"

# Verify data deleted from database
wrangler d1 execute wikipedia-db --remote --command \
  "SELECT COUNT(*) FROM chat_sessions WHERE session_id = '$SESSION_ID';"
# Should return 0
```

**3. Opt-Out Test**
```bash
# Opt out of logging
curl -X POST https://cloudflare-rag-demo.stevenleve.com/api/privacy/opt-out \
  -H "X-Session-ID: $SESSION_ID"

# Send test message
curl -X POST https://cloudflare-rag-demo.stevenleve.com/api/v1/query \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{"question":"test after opt-out"}'

# Verify no new logs created
wrangler d1 execute wikipedia-db --remote --command \
  "SELECT COUNT(*) FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE session_id = '$SESSION_ID');"
# Should not increase
```

**4. Retention Test**
```bash
# Create session with past expiry
wrangler d1 execute wikipedia-db --remote --command \
  "INSERT INTO chat_sessions (session_id, expires_at) VALUES ('expired-test', $(date -d '100 days ago' +%s)000);"

# Trigger cleanup
# (Wait for scheduled job or trigger manually)

# Verify expired session deleted
wrangler d1 execute wikipedia-db --remote --command \
  "SELECT COUNT(*) FROM chat_sessions WHERE session_id = 'expired-test';"
# Should return 0
```

**Checklist**:
- [ ] Test data export endpoint
- [ ] Test data deletion endpoint
- [ ] Test opt-out mechanism
- [ ] Test retention cleanup
- [ ] Test cascade deletion
- [ ] Test audit logging
- [ ] Document test results

---

## Compliance Monitoring

### Ongoing Requirements

**Monthly**:
- [ ] Review privacy policy for accuracy
- [ ] Audit data retention compliance
- [ ] Review deletion requests log
- [ ] Check cleanup job execution
- [ ] Verify opt-out mechanisms working

**Quarterly**:
- [ ] Full privacy audit
- [ ] Update documentation if needed
- [ ] Review consent flow effectiveness
- [ ] Legal compliance review

**Annual**:
- [ ] GDPR/CCPA compliance review
- [ ] Update privacy policy
- [ ] Re-train team on privacy requirements
- [ ] External audit (if applicable)

---

## Success Criteria

**Phase 1 Complete** (Data Access):
- ✅ Export endpoint functional
- ✅ Returns all user data in JSON
- ✅ Properly formatted and documented

**Phase 2 Complete** (Data Deletion):
- ✅ Deletion endpoint functional
- ✅ Cascade deletion verified
- ✅ Audit logging implemented

**Phase 3 Complete** (Opt-Out):
- ✅ Opt-out endpoint functional
- ✅ Chat logger respects flag
- ✅ No logs created after opt-out

**Phase 4 Complete** (Retention):
- ✅ Cleanup cron job running daily
- ✅ Expired data automatically deleted
- ✅ Audit logging functional

**Phase 5 Complete** (Documentation):
- ✅ Privacy policy published
- ✅ Consent flow implemented
- ✅ User rights documented
- ✅ Legal review completed

**Overall Compliance**:
- ✅ GDPR Articles 15, 17, 20 implemented
- ✅ CCPA rights implemented
- ✅ Privacy policy comprehensive
- ✅ Automated compliance mechanisms
- ✅ Audit trail complete

---

**Last Updated**: 2026-01-17
**Next Review**: After Phase 1 completion
**Owner**: Privacy Team + Backend
