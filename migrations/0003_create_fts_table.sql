-- Migration: Create full-text search virtual table
-- Purpose: Enable hybrid search (vector + keyword) for advanced RAG patterns
-- Created: 2025-01-06
-- Note: This is for future advanced patterns (reranking, hybrid search)

-- FTS5 virtual table for full-text search on chunks
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id UNINDEXED,
  text,
  title,
  content='chunks',
  content_rowid='rowid'
);

-- Trigger to keep FTS index in sync with chunks table
CREATE TRIGGER IF NOT EXISTS chunks_fts_insert AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(chunk_id, text, title)
  SELECT
    new.id,
    new.text,
    (SELECT title FROM documents WHERE id = new.document_id)
  ;
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_delete AFTER DELETE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_update AFTER UPDATE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.id;
  INSERT INTO chunks_fts(chunk_id, text, title)
  SELECT
    new.id,
    new.text,
    (SELECT title FROM documents WHERE id = new.document_id)
  ;
END;
