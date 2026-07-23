-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable: richer experience fields
ALTER TABLE "experiences"
  ADD COLUMN "includesNote" TEXT,
  ADD COLUMN "whatToBringNote" TEXT,
  ADD COLUMN "maxAge" INTEGER;

-- AlterTable: sessions can belong to a specific hosting location
ALTER TABLE "experience_sessions"
  ADD COLUMN "experienceBusinessId" TEXT,
  ADD COLUMN "capacity" INTEGER;

-- CreateTable: experience ↔ business hosting links (multi-location)
CREATE TABLE "experience_businesses" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "experience_businesses_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "experience_businesses_experienceId_businessId_key" ON "experience_businesses"("experienceId", "businessId");
CREATE INDEX "experience_businesses_businessId_status_idx" ON "experience_businesses"("businessId", "status");

-- Foreign keys
ALTER TABLE "experience_businesses" ADD CONSTRAINT "experience_businesses_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experience_businesses" ADD CONSTRAINT "experience_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experience_sessions" ADD CONSTRAINT "experience_sessions_experienceBusinessId_fkey" FOREIGN KEY ("experienceBusinessId") REFERENCES "experience_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
