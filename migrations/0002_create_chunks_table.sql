-- Migration: Create chunks table
-- Purpose: Store text chunks from Wikipedia articles
-- Created: 2025-01-06

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Index for querying by document_id
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);

-- Index for ordering chunks
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON chunks(chunk_index);

-- Composite index for efficient chunk retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_document_index ON chunks(document_id, chunk_index);
