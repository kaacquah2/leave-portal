-- Initial database schema
-- This migration creates the base tables for offline storage

-- Sync queue for pending changes
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retries INTEGER DEFAULT 0,
  last_error TEXT
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sync_queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON sync_queue(table_name);

