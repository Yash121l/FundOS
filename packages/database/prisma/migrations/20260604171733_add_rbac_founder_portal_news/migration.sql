-- CreateEnum
CREATE TYPE "NewsSubmissionType" AS ENUM ('CUSTOMER_WIN', 'PARTNERSHIP', 'PRODUCT_LAUNCH', 'HIRING_UPDATE', 'PRESS_MENTION', 'OTHER');

-- AlterEnum: add new values (must commit before using them as defaults)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ANALYST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LP';

-- AlterTable: founder_updates new fields
ALTER TABLE "founder_updates"
  ADD COLUMN IF NOT EXISTS "rawEmailContent" TEXT,
  ADD COLUMN IF NOT EXISTS "senderEmail"     TEXT,
  ADD COLUMN IF NOT EXISTS "source"          TEXT DEFAULT 'WEB';

-- AlterTable: lp_reports — rename lp_profile column (drop old index first if any)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'lp_reports' AND indexname = 'lp_reports_lp_profile_gin_idx'
  ) THEN
    DROP INDEX "lp_reports_lp_profile_gin_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lp_reports' AND column_name = 'lp_profile'
  ) THEN
    ALTER TABLE "lp_reports" RENAME COLUMN "lp_profile" TO "lpProfile";
  END IF;
END $$;

-- AlterTable: users — add companyId
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- CreateTable: lp_report_access
CREATE TABLE IF NOT EXISTS "lp_report_access" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    CONSTRAINT "lp_report_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable: founder_news_submissions
CREATE TABLE IF NOT EXISTS "founder_news_submissions" (
    "id"            TEXT NOT NULL,
    "companyId"     TEXT NOT NULL,
    "submittedById" TEXT,
    "type"          "NewsSubmissionType" NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "impact"        TEXT,
    "url"           TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_news_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lp_report_access_userId_idx"   ON "lp_report_access"("userId");
CREATE INDEX IF NOT EXISTS "lp_report_access_reportId_idx" ON "lp_report_access"("reportId");
CREATE UNIQUE INDEX IF NOT EXISTS "lp_report_access_userId_reportId_key" ON "lp_report_access"("userId", "reportId");
CREATE INDEX IF NOT EXISTS "founder_news_submissions_companyId_idx"    ON "founder_news_submissions"("companyId");
CREATE INDEX IF NOT EXISTS "founder_news_submissions_submittedById_idx" ON "founder_news_submissions"("submittedById");
CREATE INDEX IF NOT EXISTS "users_companyId_idx" ON "users"("companyId");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lp_report_access"
  ADD CONSTRAINT "lp_report_access_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lp_report_access"
  ADD CONSTRAINT "lp_report_access_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "lp_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "founder_news_submissions"
  ADD CONSTRAINT "founder_news_submissions_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "founder_news_submissions"
  ADD CONSTRAINT "founder_news_submissions_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
