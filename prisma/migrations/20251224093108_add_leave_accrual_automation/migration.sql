-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "accrualPeriod" TEXT,
ADD COLUMN     "annualCarryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "annualExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lastAccrualDate" TIMESTAMP(3),
ADD COLUMN     "sickCarryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sickExpiresAt" TIMESTAMP(3),
ADD COLUMN     "specialServiceCarryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "specialServiceExpiresAt" TIMESTAMP(3),
ADD COLUMN     "studyCarryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "studyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trainingCarryForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trainingExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LeaveAccrualHistory" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "accrualDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accrualPeriod" TEXT NOT NULL,
    "daysAccrued" DOUBLE PRECISION NOT NULL,
    "daysBefore" DOUBLE PRECISION NOT NULL,
    "daysAfter" DOUBLE PRECISION NOT NULL,
    "proRataFactor" DOUBLE PRECISION,
    "carryForwardDays" DOUBLE PRECISION,
    "expiredDays" DOUBLE PRECISION,
    "notes" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveAccrualHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveAccrualHistory_staffId_accrualDate_idx" ON "LeaveAccrualHistory"("staffId", "accrualDate");

-- CreateIndex
CREATE INDEX "LeaveAccrualHistory_accrualDate_idx" ON "LeaveAccrualHistory"("accrualDate");

-- CreateIndex
CREATE INDEX "LeaveAccrualHistory_leaveType_idx" ON "LeaveAccrualHistory"("leaveType");

-- CreateIndex
CREATE INDEX "LeaveBalance_lastAccrualDate_idx" ON "LeaveBalance"("lastAccrualDate");

-- CreateIndex
CREATE INDEX "LeaveBalance_annualExpiresAt_idx" ON "LeaveBalance"("annualExpiresAt");

-- AddForeignKey
ALTER TABLE "LeaveAccrualHistory" ADD CONSTRAINT "LeaveAccrualHistory_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "LeaveBalance"("staffId") ON DELETE CASCADE ON UPDATE CASCADE;
