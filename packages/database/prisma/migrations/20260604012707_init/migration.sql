-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PARTNER', 'PORTFOLIO_OPS', 'FINANCE', 'FOUNDER');

-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('SAAS', 'FINTECH', 'AI', 'DEVTOOLS', 'CLIMATETECH', 'HEALTHTECH', 'MARKETPLACE', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'EXITED', 'WRITTEN_OFF', 'WATCH');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'WATCHLIST', 'AT_RISK');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('FOUNDER_UPDATE', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "FundraisingStatus" AS ENUM ('NOT_RAISING', 'EXPLORING', 'ACTIVELY_RAISING', 'TERM_SHEET', 'CLOSED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('BURN', 'REVENUE', 'TEAM', 'PRODUCT', 'MARKET', 'FUNDRAISING', 'OPERATIONAL', 'LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'ACTED_ON', 'DISMISSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'EXPORTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrendCategory" AS ENUM ('SHARED_RISK', 'HIRING_PATTERN', 'FUNDRAISING', 'GROWTH_PATTERN', 'MARKET_EVENT', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'ACTIONED');

-- CreateEnum
CREATE TYPE "SignalCategory" AS ENUM ('FUNDING_NEWS', 'COMPETITOR_ACTIVITY', 'MARKET_TREND', 'REGULATION', 'ACQUISITION', 'IPO', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PORTFOLIO_OPS',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "sector" "Sector" NOT NULL,
    "stage" "Stage" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "foundedYear" INTEGER,
    "description" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "latestMetricsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "mrr" DOUBLE PRECISION,
    "arr" DOUBLE PRECISION,
    "revenueGrowthMom" DOUBLE PRECISION,
    "revenueGrowthYoy" DOUBLE PRECISION,
    "grossMargin" DOUBLE PRECISION,
    "nrr" DOUBLE PRECISION,
    "burnRate" DOUBLE PRECISION,
    "cashBalance" DOUBLE PRECISION,
    "runway" DOUBLE PRECISION,
    "headcount" INTEGER,
    "headcountChange" INTEGER,
    "healthScore" DOUBLE PRECISION,
    "source" "MetricSource" NOT NULL DEFAULT 'FOUNDER_UPDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_updates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "submittedById" TEXT,
    "mrr" DOUBLE PRECISION,
    "burnRate" DOUBLE PRECISION,
    "cashBalance" DOUBLE PRECISION,
    "runway" DOUBLE PRECISION,
    "headcount" INTEGER,
    "fundraisingStatus" "FundraisingStatus" NOT NULL DEFAULT 'NOT_RAISING',
    "fundraisingNote" TEXT,
    "wins" TEXT NOT NULL,
    "risks" TEXT NOT NULL,
    "hiringNeeds" TEXT,
    "additionalNotes" TEXT,
    "aiSummary" TEXT,
    "aiProcessedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "founder_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "updateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "category" "RiskCategory" NOT NULL,
    "source" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "updateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "updateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lp_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "generatedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "markdownContent" TEXT,
    "pdfUrl" TEXT,
    "fundMetricsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lp_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lp_report_sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lp_report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_companies" (
    "reportId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "report_companies_pkey" PRIMARY KEY ("reportId","companyId")
);

-- CreateTable
CREATE TABLE "trend_findings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "TrendCategory" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "affectedCount" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "TrendStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissedAt" TIMESTAMP(3),
    "actionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_evidence" (
    "id" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "updateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_signals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "category" "SignalCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_signals" (
    "signalId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "relevanceExplanation" TEXT,

    CONSTRAINT "company_signals_pkey" PRIMARY KEY ("signalId","companyId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_sector_idx" ON "companies"("sector");

-- CreateIndex
CREATE INDEX "companies_healthStatus_idx" ON "companies"("healthStatus");

-- CreateIndex
CREATE INDEX "companies_stage_idx" ON "companies"("stage");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "metric_snapshots_companyId_idx" ON "metric_snapshots"("companyId");

-- CreateIndex
CREATE INDEX "metric_snapshots_period_idx" ON "metric_snapshots"("period");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_companyId_period_key" ON "metric_snapshots"("companyId", "period");

-- CreateIndex
CREATE INDEX "founder_updates_companyId_idx" ON "founder_updates"("companyId");

-- CreateIndex
CREATE INDEX "founder_updates_period_idx" ON "founder_updates"("period");

-- CreateIndex
CREATE INDEX "founder_updates_reviewedAt_idx" ON "founder_updates"("reviewedAt");

-- CreateIndex
CREATE INDEX "risks_companyId_idx" ON "risks"("companyId");

-- CreateIndex
CREATE INDEX "risks_status_idx" ON "risks"("status");

-- CreateIndex
CREATE INDEX "risks_severity_idx" ON "risks"("severity");

-- CreateIndex
CREATE INDEX "opportunities_companyId_idx" ON "opportunities"("companyId");

-- CreateIndex
CREATE INDEX "actions_companyId_idx" ON "actions"("companyId");

-- CreateIndex
CREATE INDEX "actions_status_idx" ON "actions"("status");

-- CreateIndex
CREATE INDEX "tasks_companyId_idx" ON "tasks"("companyId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "lp_reports_quarter_idx" ON "lp_reports"("quarter");

-- CreateIndex
CREATE INDEX "lp_reports_status_idx" ON "lp_reports"("status");

-- CreateIndex
CREATE INDEX "lp_report_sections_reportId_idx" ON "lp_report_sections"("reportId");

-- CreateIndex
CREATE INDEX "trend_findings_category_idx" ON "trend_findings"("category");

-- CreateIndex
CREATE INDEX "trend_findings_status_idx" ON "trend_findings"("status");

-- CreateIndex
CREATE INDEX "trend_evidence_trendId_idx" ON "trend_evidence"("trendId");

-- CreateIndex
CREATE INDEX "trend_evidence_companyId_idx" ON "trend_evidence"("companyId");

-- CreateIndex
CREATE INDEX "market_signals_category_idx" ON "market_signals"("category");

-- CreateIndex
CREATE INDEX "market_signals_publishedAt_idx" ON "market_signals"("publishedAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "founder_updates" ADD CONSTRAINT "founder_updates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "founder_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "founder_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "founder_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lp_report_sections" ADD CONSTRAINT "lp_report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "lp_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_companies" ADD CONSTRAINT "report_companies_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "lp_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_companies" ADD CONSTRAINT "report_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_evidence" ADD CONSTRAINT "trend_evidence_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "trend_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_evidence" ADD CONSTRAINT "trend_evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_signals" ADD CONSTRAINT "company_signals_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "market_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_signals" ADD CONSTRAINT "company_signals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
