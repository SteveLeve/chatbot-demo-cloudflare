-- Composite index for privacy export: WHERE session_id = ? ORDER BY created_at
-- (#17). UNIQUE(session_id, message_index) already covers session lookups;
-- this index matches the created_at sort used in src/utils/privacy-data.ts.

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at);
