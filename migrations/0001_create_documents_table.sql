-- Migration: Create documents table
-- Purpose: Store Wikipedia article metadata
-- Created: 2025-01-06

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for querying by article_id
CREATE INDEX IF NOT EXISTS idx_documents_article_id ON documents(article_id);

-- Index for querying by creation time
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Index for full-text search on title
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
