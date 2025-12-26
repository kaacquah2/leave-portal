-- AlterTable
ALTER TABLE "LeavePolicy" ADD COLUMN     "accrualFrequency" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "expiresAfterMonths" INTEGER;
