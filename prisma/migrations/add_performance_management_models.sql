-- Performance Management Enhancements
-- Add models for Goals, 360 Feedback, Performance Improvement Plans, and Promotions

-- Performance Goals (separate from review goals for tracking)
CREATE TABLE IF NOT EXISTS "PerformanceGoal" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL, -- 'performance' | 'development' | 'behavioral' | 'skill'
  "targetValue" TEXT, -- Target metric/value
  "currentValue" TEXT, -- Current progress
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'cancelled' | 'on_hold'
  "progress" INTEGER DEFAULT 0, -- 0-100 percentage
  "reviewId" TEXT, -- Link to performance review if created during review
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerformanceGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerformanceGoal_staffId_idx" ON "PerformanceGoal"("staffId");
CREATE INDEX IF NOT EXISTS "PerformanceGoal_status_idx" ON "PerformanceGoal"("status");
CREATE INDEX IF NOT EXISTS "PerformanceGoal_dueDate_idx" ON "PerformanceGoal"("dueDate");

-- 360-Degree Feedback
CREATE TABLE IF NOT EXISTS "Feedback360" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL, -- Employee being reviewed
  "reviewerId" TEXT NOT NULL, -- Staff ID of reviewer
  "reviewerName" TEXT NOT NULL,
  "reviewerRole" TEXT NOT NULL, -- 'peer' | 'subordinate' | 'manager' | 'client' | 'other'
  "reviewPeriod" TEXT NOT NULL, -- e.g., "2024 Q1"
  "rating" INTEGER NOT NULL, -- 1-5 overall rating
  "strengths" TEXT[],
  "areasForImprovement" TEXT[],
  "communication" INTEGER, -- 1-5 rating
  "teamwork" INTEGER, -- 1-5 rating
  "leadership" INTEGER, -- 1-5 rating (if applicable)
  "problemSolving" INTEGER, -- 1-5 rating
  "comments" TEXT,
  "anonymous" BOOLEAN DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'submitted' | 'reviewed'
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Feedback360_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Feedback360_staffId_idx" ON "Feedback360"("staffId");
CREATE INDEX IF NOT EXISTS "Feedback360_reviewerId_idx" ON "Feedback360"("reviewerId");
CREATE INDEX IF NOT EXISTS "Feedback360_reviewPeriod_idx" ON "Feedback360"("reviewPeriod");
CREATE INDEX IF NOT EXISTS "Feedback360_status_idx" ON "Feedback360"("status");

-- Performance Improvement Plans (PIPs)
CREATE TABLE IF NOT EXISTS "PerformanceImprovementPlan" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "performanceIssues" TEXT[] NOT NULL, -- Array of identified issues
  "expectedOutcomes" TEXT[] NOT NULL, -- Expected improvements
  "actionItems" JSONB NOT NULL, -- Array of {task, dueDate, responsible, status}
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reviewDate" TIMESTAMP(3), -- Next review date
  "status" TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'extended' | 'terminated'
  "createdBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "progressNotes" TEXT[], -- Progress tracking notes
  "outcome" TEXT, -- 'successful' | 'partially_successful' | 'unsuccessful' | null
  "outcomeNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerformanceImprovementPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerformanceImprovementPlan_staffId_idx" ON "PerformanceImprovementPlan"("staffId");
CREATE INDEX IF NOT EXISTS "PerformanceImprovementPlan_status_idx" ON "PerformanceImprovementPlan"("status");
CREATE INDEX IF NOT EXISTS "PerformanceImprovementPlan_startDate_idx" ON "PerformanceImprovementPlan"("startDate");

-- Promotion Tracking
CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "fromPosition" TEXT NOT NULL,
  "fromGrade" TEXT,
  "fromLevel" TEXT,
  "toPosition" TEXT NOT NULL,
  "toGrade" TEXT,
  "toLevel" TEXT,
  "promotionDate" TIMESTAMP(3) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "salaryIncrease" DECIMAL(10,2), -- Percentage or amount
  "reason" TEXT NOT NULL, -- Reason for promotion
  "approvedBy" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'completed'
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Promotion_staffId_idx" ON "Promotion"("staffId");
CREATE INDEX IF NOT EXISTS "Promotion_status_idx" ON "Promotion"("status");
CREATE INDEX IF NOT EXISTS "Promotion_promotionDate_idx" ON "Promotion"("promotionDate");

-- Add foreign key constraints (if StaffMember table exists)
-- Note: These will be added via Prisma migration

