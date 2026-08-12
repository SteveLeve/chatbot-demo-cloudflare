-- Privacy compliance schema (#19)
-- Adds opt-out flag and deletion audit log

ALTER TABLE chat_sessions ADD COLUMN logging_enabled INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS deletion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_at ON deletion_log(deleted_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_logging_enabled ON chat_sessions(logging_enabled);
