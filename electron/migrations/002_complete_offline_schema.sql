-- Complete Offline-First Database Schema
-- Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
-- 
-- IMPORTANT: This migration is for SQLite ONLY (Electron local database)
-- DO NOT run this migration against PostgreSQL/Prisma database
-- This migration should ONLY be executed by electron/database-encrypted.js
--
-- This migration creates all tables required for offline operation:
-- - Core HR data (read-only offline)
-- - Leave management (read + write offline)
-- - Authentication (limited offline)
-- - Audit & compliance (write offline)
-- - Sync metadata and queue
--
-- Design Principles:
-- 1. UUIDs for all primary keys (ensures uniqueness across devices)
-- 2. ISO 8601 timestamps (UTC, sortable, timezone-aware)
-- 3. Sync flags on all mutable records (sync_status, server_updated_at)
-- 4. Foreign key constraints for data integrity
-- 5. Indexes for performance on common queries

-- ============================================
-- CORE HR DATA (Read-Only Offline)
-- ============================================

-- Staff members (employees)
-- Mirrors Prisma StaffMember model with sync metadata
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, -- UUID
  staff_id TEXT UNIQUE NOT NULL, -- Unique staff identifier (e.g., "MOFA-001234")
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  grade TEXT NOT NULL,
  level TEXT NOT NULL,
  rank TEXT,
  step TEXT,
  directorate TEXT,
  division TEXT,
  unit TEXT,
  duty_station TEXT, -- 'HQ' | 'Region' | 'District' | 'Agency'
  photo_url TEXT,
  active INTEGER NOT NULL DEFAULT 1, -- Boolean: 1 = true, 0 = false
  employment_status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'terminated' | 'resigned' | 'retired' | 'suspended'
  termination_date TEXT, -- ISO 8601 timestamp
  termination_reason TEXT,
  join_date TEXT NOT NULL, -- ISO 8601 timestamp
  confirmation_date TEXT, -- ISO 8601 timestamp
  manager_id TEXT, -- Staff ID of manager (self-referential)
  immediate_supervisor_id TEXT, -- Staff ID of immediate supervisor
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced' | 'pending' | 'conflict' | 'error'
  server_updated_at TEXT, -- Last update time from server (ISO 8601)
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), -- Local update time
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (manager_id) REFERENCES employees(staff_id) ON DELETE SET NULL,
  FOREIGN KEY (immediate_supervisor_id) REFERENCES employees(staff_id) ON DELETE SET NULL
);

-- Organizational structure (duty stations, departments, etc.)
-- Denormalized for offline performance
CREATE TABLE IF NOT EXISTS organizational_structure (
  id TEXT PRIMARY KEY, -- UUID
  type TEXT NOT NULL, -- 'department' | 'directorate' | 'division' | 'unit' | 'duty_station'
  name TEXT NOT NULL,
  code TEXT, -- Optional code (e.g., "HRMU", "PPME")
  parent_id TEXT, -- Parent structure ID (for hierarchy)
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'synced',
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (parent_id) REFERENCES organizational_structure(id) ON DELETE SET NULL,
  UNIQUE(type, name)
);

-- ============================================
-- LEAVE MANAGEMENT (Read + Write Offline)
-- ============================================

-- Leave requests
-- Mirrors Prisma LeaveRequest model with sync metadata
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY, -- UUID
  staff_id TEXT NOT NULL,
  staff_name TEXT NOT NULL, -- Denormalized for performance
  leave_type TEXT NOT NULL, -- 'Annual' | 'Sick' | 'Unpaid' | 'SpecialService' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
  start_date TEXT NOT NULL, -- ISO 8601 timestamp
  end_date TEXT NOT NULL, -- ISO 8601 timestamp
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by TEXT, -- User ID of final approver
  approval_date TEXT, -- ISO 8601 timestamp
  template_id TEXT,
  approval_levels TEXT, -- JSON string
  officer_taking_over TEXT,
  handover_notes TEXT,
  declaration_accepted INTEGER NOT NULL DEFAULT 0, -- Boolean
  payroll_impact_flag INTEGER NOT NULL DEFAULT 0, -- Boolean
  locked INTEGER NOT NULL DEFAULT 0, -- Boolean
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'pending', -- New requests start as 'pending'
  server_id TEXT, -- Server-assigned ID (if synced)
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (staff_id) REFERENCES employees(staff_id) ON DELETE CASCADE
);

-- Leave balances
-- Mirrors Prisma LeaveBalance model
CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY, -- UUID
  staff_id TEXT UNIQUE NOT NULL,
  annual REAL NOT NULL DEFAULT 0,
  sick REAL NOT NULL DEFAULT 0,
  unpaid REAL NOT NULL DEFAULT 0,
  special_service REAL NOT NULL DEFAULT 0,
  training REAL NOT NULL DEFAULT 0,
  study REAL NOT NULL DEFAULT 0,
  maternity REAL NOT NULL DEFAULT 0,
  paternity REAL NOT NULL DEFAULT 0,
  compassionate REAL NOT NULL DEFAULT 0,
  -- Accrual tracking
  last_accrual_date TEXT,
  accrual_period TEXT, -- 'monthly' | 'annual' | 'quarterly'
  -- Carry-forward tracking
  annual_carry_forward REAL NOT NULL DEFAULT 0,
  sick_carry_forward REAL NOT NULL DEFAULT 0,
  special_service_carry_forward REAL NOT NULL DEFAULT 0,
  training_carry_forward REAL NOT NULL DEFAULT 0,
  study_carry_forward REAL NOT NULL DEFAULT 0,
  -- Expiration tracking
  annual_expires_at TEXT,
  sick_expires_at TEXT,
  special_service_expires_at TEXT,
  training_expires_at TEXT,
  study_expires_at TEXT,
  -- Sync metadata (balances are server-authoritative)
  sync_status TEXT NOT NULL DEFAULT 'synced',
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (staff_id) REFERENCES employees(staff_id) ON DELETE CASCADE
);

-- Leave attachments
-- Documents attached to leave requests
CREATE TABLE IF NOT EXISTS leave_attachments (
  id TEXT PRIMARY KEY, -- UUID
  leave_request_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Local file path (encrypted storage)
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL, -- User ID
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'pending',
  server_id TEXT,
  server_url TEXT, -- Server URL if synced
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
);

-- Holidays (public holidays, office closures)
-- Read-only offline, synced from server
CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY, -- UUID
  name TEXT NOT NULL,
  date TEXT NOT NULL, -- ISO 8601 date (YYYY-MM-DD)
  type TEXT NOT NULL DEFAULT 'public', -- 'public' | 'office_closure' | 'regional'
  region TEXT, -- Optional region restriction
  description TEXT,
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'synced',
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(date, name)
);

-- Approval history
-- Tracks all approval actions (immutable audit trail)
CREATE TABLE IF NOT EXISTS approval_history (
  id TEXT PRIMARY KEY, -- UUID
  leave_request_id TEXT NOT NULL,
  approver_id TEXT NOT NULL, -- User ID
  approver_name TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approved' | 'rejected' | 'delegated' | 'escalated'
  level INTEGER NOT NULL, -- Approval level (1, 2, 3, etc.)
  comments TEXT,
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'pending',
  server_id TEXT,
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
);

-- ============================================
-- AUTHENTICATION (Limited Offline)
-- ============================================

-- Local sessions
-- Device-bound sessions for offline access
-- NO password storage - only tokens
CREATE TABLE IF NOT EXISTS local_sessions (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL, -- User ID from server
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  staff_id TEXT, -- Optional staff ID link
  token_hash TEXT NOT NULL, -- Hashed token (not plain token)
  device_id TEXT NOT NULL, -- Device identifier (for device binding)
  expires_at TEXT NOT NULL, -- ISO 8601 timestamp
  last_activity TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), -- ISO 8601 timestamp
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  -- Index for expiration checks
  CHECK(expires_at > created_at)
);

-- ============================================
-- AUDIT & COMPLIANCE (Write Offline)
-- ============================================

-- Audit logs
-- Immutable audit trail for all actions
-- Mirrors Prisma AuditLog model
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, -- UUID
  action TEXT NOT NULL, -- Action type (e.g., 'leave_submitted', 'leave_approved', 'user_login')
  user TEXT NOT NULL, -- User ID or email
  user_role TEXT, -- Role of user performing action
  staff_id TEXT, -- Related staff ID (if applicable)
  leave_request_id TEXT, -- Related leave request ID (if applicable)
  details TEXT NOT NULL, -- Detailed description
  ip_address TEXT,
  user_agent TEXT,
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'pending', -- Audit logs must sync
  server_id TEXT,
  server_updated_at TEXT,
  local_updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL
);

-- ============================================
-- SYNC METADATA & QUEUE
-- ============================================

-- Sync queue (already exists in 001_initial_schema.sql, but enhanced here)
-- Tracks all pending sync operations
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON string of record data
  priority INTEGER NOT NULL DEFAULT 0, -- Higher priority syncs first (0 = normal, 1 = high, 2 = urgent)
  retries INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  last_attempt_at TEXT, -- ISO 8601 timestamp
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  -- Indexes for efficient queue processing
  CHECK(retries <= max_retries)
);

-- Sync metadata (already exists in 001_initial_schema.sql, but enhanced here)
-- Key-value store for sync state
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Dead letter queue
-- Failed syncs that exceeded max retries
CREATE TABLE IF NOT EXISTS sync_dead_letter_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL,
  last_attempt_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_staff_id ON employees(staff_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_sync_status ON employees(sync_status);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_status ON leave_requests(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_sync_status ON leave_requests(sync_status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at);

-- Leave balances indexes
CREATE INDEX IF NOT EXISTS idx_leave_balances_staff_id ON leave_balances(staff_id);

-- Leave attachments indexes
CREATE INDEX IF NOT EXISTS idx_leave_attachments_leave_request_id ON leave_attachments(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_attachments_sync_status ON leave_attachments(sync_status);

-- Holidays indexes
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);

-- Approval history indexes
CREATE INDEX IF NOT EXISTS idx_approval_history_leave_request_id ON approval_history(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver_id ON approval_history(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_sync_status ON approval_history(sync_status);

-- Local sessions indexes
CREATE INDEX IF NOT EXISTS idx_local_sessions_user_id ON local_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_local_sessions_device_id ON local_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_local_sessions_expires_at ON local_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_local_sessions_token_hash ON local_sessions(token_hash);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_leave_request_id ON audit_logs(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_status ON audit_logs(sync_status);

-- Sync queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON sync_queue(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_retries ON sync_queue(retries, max_retries);

-- Organizational structure indexes
CREATE INDEX IF NOT EXISTS idx_org_structure_type ON organizational_structure(type);
CREATE INDEX IF NOT EXISTS idx_org_structure_parent_id ON organizational_structure(parent_id);

-- ============================================
-- INITIAL SYNC METADATA
-- ============================================

-- Insert default sync metadata
INSERT OR IGNORE INTO sync_metadata (key, value) VALUES
  ('last_sync_at', '1970-01-01T00:00:00Z'),
  ('sync_schema_version', '1'),
  ('last_full_sync_at', '1970-01-01T00:00:00Z'),
  ('sync_enabled', 'true'),
  ('conflict_resolution_strategy', 'server_wins');

