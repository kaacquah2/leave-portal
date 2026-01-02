-- Seed Static Data Migration
-- Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
-- 
-- This migration seeds static reference data that should be available offline:
-- - Leave types (if not already seeded by bootstrap)
-- - Policy versions (if not already seeded by bootstrap)
-- 
-- Note: Holidays are seeded dynamically by bootstrap.js based on current year
-- This migration ensures data exists even if bootstrap was skipped

-- Leave types (if table exists and not already populated)
INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001' as id,
  'ANNUAL' as code,
  'Annual Leave' as name,
  'Annual vacation leave' as description,
  30 as max_days,
  1 as requires_approval,
  'monthly' as accrual_type,
  1 as can_carry_forward,
  10 as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'ANNUAL');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002' as id,
  'SICK' as code,
  'Sick Leave' as name,
  'Medical leave for illness' as description,
  15 as max_days,
  1 as requires_approval,
  'monthly' as accrual_type,
  1 as can_carry_forward,
  5 as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'SICK');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000003' as id,
  'UNPAID' as code,
  'Unpaid Leave' as name,
  'Leave without pay' as description,
  NULL as max_days,
  1 as requires_approval,
  'none' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'UNPAID');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000004' as id,
  'SPECIAL_SERVICE' as code,
  'Special Service Leave' as name,
  'Leave for special government service' as description,
  7 as max_days,
  1 as requires_approval,
  'annual' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'SPECIAL_SERVICE');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000005' as id,
  'TRAINING' as code,
  'Training Leave' as name,
  'Leave for training and development' as description,
  10 as max_days,
  1 as requires_approval,
  'annual' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'TRAINING');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000006' as id,
  'STUDY' as code,
  'Study Leave' as name,
  'Leave for academic studies' as description,
  30 as max_days,
  1 as requires_approval,
  'annual' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'STUDY');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000007' as id,
  'MATERNITY' as code,
  'Maternity Leave' as name,
  'Maternity leave for female staff' as description,
  90 as max_days,
  1 as requires_approval,
  'none' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'MATERNITY');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000008' as id,
  'PATERNITY' as code,
  'Paternity Leave' as name,
  'Paternity leave for male staff' as description,
  7 as max_days,
  1 as requires_approval,
  'none' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'PATERNITY');

INSERT OR IGNORE INTO leave_types (id, code, name, description, max_days, requires_approval, accrual_type, can_carry_forward, max_carry_forward, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000009' as id,
  'COMPASSIONATE' as code,
  'Compassionate Leave' as name,
  'Leave for bereavement' as description,
  5 as max_days,
  1 as requires_approval,
  'none' as accrual_type,
  0 as can_carry_forward,
  NULL as max_carry_forward,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'COMPASSIONATE');

-- Policy versions (if table exists and not already populated)
INSERT OR IGNORE INTO policy_versions (id, version, name, description, effective_date, active, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000010' as id,
  '1.0.0' as version,
  'MoFA HR Leave Policy v1.0' as name,
  'Initial leave policy for Ministry of Foreign Affairs, Ghana' as description,
  date('now') as effective_date,
  1 as active,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
WHERE NOT EXISTS (SELECT 1 FROM policy_versions WHERE version = '1.0.0');

