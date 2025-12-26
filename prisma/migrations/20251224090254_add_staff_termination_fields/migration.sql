-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN     "employmentStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "terminationDate" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT;
