-- ============================================================================
-- Chat Sessions Table
-- Stores session-level metadata and client information
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY, -- UUID v4
  session_id TEXT NOT NULL UNIQUE,

  -- Client metadata (privacy-compliant)
  ip_hash TEXT NOT NULL,  -- SHA-256 hash of IP address
  user_agent TEXT,

  -- Cloudflare-specific metadata (from c.req.raw.cf)
  country TEXT,  -- Country code (e.g., 'US')
  region TEXT,   -- Region code (e.g., 'CA')
  city TEXT,
  latitude TEXT, -- Stored as text in D1
  longitude TEXT,
  timezone TEXT,
  colo TEXT,     -- Cloudflare data center (e.g., 'SJC')
  asn INTEGER,   -- Autonomous System Number

  -- Session tracking
  created_at INTEGER NOT NULL,  -- Unix timestamp in milliseconds
  updated_at INTEGER NOT NULL,
  last_message_at INTEGER,
  message_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,  -- SQLite uses 1/0 for boolean

  -- Retention
  expires_at INTEGER NOT NULL  -- Unix timestamp (created_at + 90 days)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ip_hash ON chat_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_country ON chat_sessions(country);

-- ============================================================================
-- Chat Messages Table
-- Stores individual messages (user inputs and AI responses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY, -- UUID v4
  session_id TEXT NOT NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Message metadata
  message_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,

  -- AI response metadata (only for assistant messages)
  model_name TEXT,  -- e.g., '@cf/meta/llama-3.1-8b-instruct'
  temperature TEXT,
  latency_ms INTEGER,
  token_count INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  -- Error tracking
  has_error INTEGER DEFAULT 0,
  error_message TEXT,

  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, message_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- ============================================================================
-- Message Chunks Table
-- Links messages to retrieved RAG chunks with similarity scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_chunks (
  id TEXT PRIMARY KEY, -- UUID v4
  message_id TEXT NOT NULL,

  -- Reference to original chunk
  chunk_id TEXT,
  document_id TEXT,

  -- Chunk data (denormalized for governance/audit)
  chunk_text TEXT NOT NULL,
  chunk_metadata TEXT,  -- JSON string

  -- Document reference
  document_title TEXT,

  -- Retrieval metadata
  similarity_score REAL NOT NULL,
  rank_position INTEGER NOT NULL,

  created_at INTEGER NOT NULL,

  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_chunks_message_id ON message_chunks(message_id);
CREATE INDEX IF NOT EXISTS idx_message_chunks_chunk_id ON message_chunks(chunk_id);
CREATE INDEX IF NOT EXISTS idx_message_chunks_similarity_score ON message_chunks(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_message_chunks_created_at ON message_chunks(created_at);
