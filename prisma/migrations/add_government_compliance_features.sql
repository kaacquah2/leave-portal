-- Government Compliance Features Migration
-- Date: December 2024
-- Legal Framework: Labour Act 651, Data Protection Act 843, Government ICT Security Standards

-- 1. Notification Preferences (Employee Notification System Enhancement)
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "leaveNotifications" BOOLEAN NOT NULL DEFAULT true,
  "approvalNotifications" BOOLEAN NOT NULL DEFAULT true,
  "systemNotifications" BOOLEAN NOT NULL DEFAULT true,
  "reminderNotifications" BOOLEAN NOT NULL DEFAULT true,
  "escalationNotifications" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- 2. Salary Structure (Salary & Payroll Management)
-- Note: SalaryStructure already exists in schema with different structure (staffId-based)
-- This migration only adds missing columns if they don't exist
DO $$ 
BEGIN
  -- Add grade column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'SalaryStructure' AND column_name = 'grade') THEN
    ALTER TABLE "SalaryStructure" ADD COLUMN "grade" TEXT;
    CREATE INDEX IF NOT EXISTS "SalaryStructure_grade_idx" ON "SalaryStructure"("grade");
  END IF;
  
  -- Add position column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'SalaryStructure' AND column_name = 'position') THEN
    ALTER TABLE "SalaryStructure" ADD COLUMN "position" TEXT;
  END IF;
  
  -- Add active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'SalaryStructure' AND column_name = 'active') THEN
    ALTER TABLE "SalaryStructure" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
    CREATE INDEX IF NOT EXISTS "SalaryStructure_active_idx" ON "SalaryStructure"("active");
  END IF;
END $$;

-- 3. Payroll Processing (Salary & Payroll Management)
-- Note: Payroll already exists in schema as period-based summary table
-- Create PayrollItem table for individual staff payroll records
CREATE TABLE IF NOT EXISTS "PayrollItem" (
  "id" TEXT NOT NULL,
  "payrollId" TEXT NOT NULL, -- Reference to Payroll period
  "staffId" TEXT NOT NULL,
  "basicSalary" DECIMAL(10,2) NOT NULL,
  "allowances" DECIMAL(10,2) DEFAULT 0,
  "grossSalary" DECIMAL(10,2) NOT NULL,
  "taxDeduction" DECIMAL(10,2) DEFAULT 0,
  "pensionDeduction" DECIMAL(10,2) DEFAULT 0,
  "otherDeductions" DECIMAL(10,2) DEFAULT 0,
  "netSalary" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'approved' | 'processed' | 'paid'
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollItem_payrollId_idx" ON "PayrollItem"("payrollId");
CREATE INDEX IF NOT EXISTS "PayrollItem_staffId_idx" ON "PayrollItem"("staffId");
CREATE INDEX IF NOT EXISTS "PayrollItem_status_idx" ON "PayrollItem"("status");

-- 4. Onboarding Checklist (Employee Onboarding & Offboarding)
-- Note: OnboardingChecklist already exists in schema with JSON items structure
-- No changes needed - existing structure is sufficient

-- 5. Offboarding Checklist (Employee Onboarding & Offboarding)
-- Note: OffboardingChecklist already exists in schema with JSON items structure
-- No changes needed - existing structure is sufficient

-- 6. Exit Interview (Employee Onboarding & Offboarding)
CREATE TABLE IF NOT EXISTS "ExitInterview" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "interviewDate" TIMESTAMP(3) NOT NULL,
  "conductedBy" TEXT NOT NULL,
  "reasonForLeaving" TEXT,
  "satisfactionRating" INTEGER, -- 1-5
  "feedback" TEXT,
  "recommendations" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExitInterview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExitInterview_staffId_idx" ON "ExitInterview"("staffId");
CREATE INDEX IF NOT EXISTS "ExitInterview_status_idx" ON "ExitInterview"("status");

-- 7. Asset Tracking (Employee Onboarding & Offboarding)
CREATE TABLE IF NOT EXISTS "Asset" (
  "id" TEXT NOT NULL,
  "assetNumber" TEXT NOT NULL,
  "assetName" TEXT NOT NULL,
  "assetType" TEXT NOT NULL, -- 'laptop' | 'phone' | 'vehicle' | 'furniture' | 'other'
  "serialNumber" TEXT,
  "assignedTo" TEXT, -- staffId
  "assignedDate" TIMESTAMP(3),
  "returnedDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'available', -- 'available' | 'assigned' | 'returned' | 'damaged' | 'lost'
  "condition" TEXT, -- 'new' | 'good' | 'fair' | 'poor'
  "notes" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_assetNumber_key" ON "Asset"("assetNumber");
CREATE INDEX IF NOT EXISTS "Asset_assignedTo_idx" ON "Asset"("assignedTo");
CREATE INDEX IF NOT EXISTS "Asset_status_idx" ON "Asset"("status");

-- 8. Training Program (Training & Development)
-- Note: TrainingProgram already exists in schema with different field names
-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add category column if it doesn't exist (schema has 'type' instead)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'category') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "category" TEXT;
    CREATE INDEX IF NOT EXISTS "TrainingProgram_category_idx" ON "TrainingProgram"("category");
  END IF;
  
  -- Add provider column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'provider') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "provider" TEXT;
  END IF;
  
  -- Add duration column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'duration') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "duration" INTEGER;
  END IF;
  
  -- Add cost column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'cost') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "cost" DECIMAL(10,2);
  END IF;
  
  -- Add maxParticipants column if it doesn't exist (schema has 'capacity')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'maxParticipants') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "maxParticipants" INTEGER;
  END IF;
  
  -- Add createdBy column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'TrainingProgram' AND column_name = 'createdBy') THEN
    ALTER TABLE "TrainingProgram" ADD COLUMN "createdBy" TEXT;
  END IF;
END $$;

-- Note: TrainingAttendance already exists in schema, so we'll use that

-- 9. Training Certificate (Training & Development)
CREATE TABLE IF NOT EXISTS "TrainingCertificate" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "trainingProgramId" TEXT,
  "certificateNumber" TEXT NOT NULL,
  "certificateName" TEXT NOT NULL,
  "issuingOrganization" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "fileUrl" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_certificateNumber_key" ON "TrainingCertificate"("certificateNumber");
CREATE INDEX IF NOT EXISTS "TrainingCertificate_staffId_idx" ON "TrainingCertificate"("staffId");
CREATE INDEX IF NOT EXISTS "TrainingCertificate_trainingProgramId_idx" ON "TrainingCertificate"("trainingProgramId");

-- Add foreign key constraints (with existence checks)
DO $$ 
BEGIN
  -- NotificationPreference foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_userId_fkey'
  ) THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- PayrollItem foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItem_staffId_fkey'
  ) THEN
    ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_staffId_fkey" 
      FOREIGN KEY ("staffId") REFERENCES "StaffMember"("staffId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItem_payrollId_fkey'
  ) THEN
    ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" 
      FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- ExitInterview foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExitInterview_staffId_fkey'
  ) THEN
    ALTER TABLE "ExitInterview" ADD CONSTRAINT "ExitInterview_staffId_fkey" 
      FOREIGN KEY ("staffId") REFERENCES "StaffMember"("staffId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Asset foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Asset_assignedTo_fkey'
  ) THEN
    ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedTo_fkey" 
      FOREIGN KEY ("assignedTo") REFERENCES "StaffMember"("staffId") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- TrainingCertificate foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingCertificate_staffId_fkey'
  ) THEN
    ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_staffId_fkey" 
      FOREIGN KEY ("staffId") REFERENCES "StaffMember"("staffId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingCertificate_trainingProgramId_fkey'
  ) THEN
    ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_trainingProgramId_fkey" 
      FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

