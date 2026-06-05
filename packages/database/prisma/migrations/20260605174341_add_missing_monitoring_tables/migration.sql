-- CreateEnum
CREATE TYPE "MorStatus" AS ENUM ('PENDING', 'DUE', 'SUBMITTED', 'LATE', 'REVIEWED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('BURN_EXCESS', 'REVENUE_MISS', 'LOW_RUNWAY', 'TEAM_EVENT', 'LEGAL', 'DOWN_ROUND', 'CUSTOMER_CONCENTRATION', 'LATE_SUBMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BoardMeetingType" AS ENUM ('QUARTERLY', 'SPECIAL', 'ANNUAL', 'LPAC');

-- CreateEnum
CREATE TYPE "BoardMeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResolutionOutcome" AS ENUM ('APPROVED', 'REJECTED', 'TABLED', 'NOTED');

-- CreateEnum
CREATE TYPE "FollowOnRecommendation" AS ENUM ('FOLLOW_ON', 'PASS', 'BRIDGE', 'WATCH');

-- CreateEnum
CREATE TYPE "FollowOnStatus" AS ENUM ('DRAFT', 'IC_SUBMITTED', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ValueAddType" AS ENUM ('TALENT_INTRO', 'CUSTOMER_BD', 'PR_FACILITATION', 'FUNDRAISE_COACHING', 'CO_INVESTOR_INTRO', 'REGULATORY_GUIDANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ValueAddStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FATFStatus" AS ENUM ('CLEAR', 'GREYLIST', 'BLACKLIST');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'FAMILY_OFFICE', 'INSTITUTIONAL', 'FUND_OF_FUNDS', 'SOVEREIGN_WEALTH', 'ENDOWMENT', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "CapitalCallStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "DistributionType" AS ENUM ('RETURN_OF_CAPITAL', 'PREFERRED_RETURN', 'CARRIED_INTEREST', 'RESIDUAL');

-- CreateEnum
CREATE TYPE "LPACMeetingType" AS ENUM ('CONFLICT_REVIEW', 'VALUATION_APPROVAL', 'MATERIAL_DECISION', 'ROUTINE', 'ANNUAL');

-- CreateEnum
CREATE TYPE "LPACMeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LPACResolutionType" AS ENUM ('CONFLICT_WAIVER', 'VALUATION_SIGN_OFF', 'FOLLOW_ON_CONSENT', 'FUND_EXTENSION', 'OTHER');

-- CreateTable
CREATE TABLE "monthly_operations_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "status" "MorStatus" NOT NULL DEFAULT 'PENDING',
    "revenueSubscription" DOUBLE PRECISION,
    "revenueServices" DOUBLE PRECISION,
    "revenueOther" DOUBLE PRECISION,
    "cogs" DOUBLE PRECISION,
    "grossProfit" DOUBLE PRECISION,
    "grossMarginPct" DOUBLE PRECISION,
    "smExpenses" DOUBLE PRECISION,
    "rdExpenses" DOUBLE PRECISION,
    "gaExpenses" DOUBLE PRECISION,
    "ebitda" DOUBLE PRECISION,
    "budgetRevenue" DOUBLE PRECISION,
    "budgetEbitda" DOUBLE PRECISION,
    "revenueVsBudgetPct" DOUBLE PRECISION,
    "ebitdaVsBudgetPct" DOUBLE PRECISION,
    "ytdRevenue" DOUBLE PRECISION,
    "ytdEbitda" DOUBLE PRECISION,
    "ytdBudgetRevenue" DOUBLE PRECISION,
    "ytdBudgetEbitda" DOUBLE PRECISION,
    "burnRate" DOUBLE PRECISION,
    "cashBalance" DOUBLE PRECISION,
    "bankBalance" DOUBLE PRECISION,
    "runway" DOUBLE PRECISION,
    "headcount" INTEGER,
    "attrition" INTEGER,
    "openRoles" INTEGER,
    "kpi1Label" TEXT,
    "kpi1Actual" DOUBLE PRECISION,
    "kpi1Target" DOUBLE PRECISION,
    "kpi2Label" TEXT,
    "kpi2Actual" DOUBLE PRECISION,
    "kpi2Target" DOUBLE PRECISION,
    "kpi3Label" TEXT,
    "kpi3Actual" DOUBLE PRECISION,
    "kpi3Target" DOUBLE PRECISION,
    "kpi4Label" TEXT,
    "kpi4Actual" DOUBLE PRECISION,
    "kpi4Target" DOUBLE PRECISION,
    "kpi5Label" TEXT,
    "kpi5Actual" DOUBLE PRECISION,
    "kpi5Target" DOUBLE PRECISION,
    "wins" TEXT,
    "misses" TEXT,
    "pivots" TEXT,
    "nextMonthPriorities" TEXT,
    "okrs" TEXT,
    "founderNotes" TEXT,
    "attachmentUrl" TEXT,
    "attachmentLabel" TEXT,
    "aiSummary" TEXT,
    "aiFlags" TEXT,
    "aiProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_operations_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mor_escalations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "morId" TEXT,
    "type" "EscalationType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "escalatedToIC" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "responseNote" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mor_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_kpi_pings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT,
    "kpi1Label" TEXT,
    "kpi1Value" DOUBLE PRECISION,
    "kpi2Label" TEXT,
    "kpi2Value" DOUBLE PRECISION,
    "kpi3Label" TEXT,
    "kpi3Value" DOUBLE PRECISION,
    "kpi4Label" TEXT,
    "kpi4Value" DOUBLE PRECISION,
    "kpi5Label" TEXT,
    "kpi5Value" DOUBLE PRECISION,
    "founderNote" TEXT,

    CONSTRAINT "weekly_kpi_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_meetings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "BoardMeetingType" NOT NULL DEFAULT 'QUARTERLY',
    "status" "BoardMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "attendees" JSONB,
    "location" TEXT,
    "minutesContent" TEXT,
    "nextQuarterPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_resolutions" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "proposedBy" TEXT,
    "outcome" "ResolutionOutcome" NOT NULL DEFAULT 'APPROVED',
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "votesAbstain" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_on_notes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "recommendation" "FollowOnRecommendation" NOT NULL DEFAULT 'WATCH',
    "amount" DOUBLE PRECISION,
    "rationale" TEXT NOT NULL,
    "keyMetrics" JSONB,
    "status" "FollowOnStatus" NOT NULL DEFAULT 'DRAFT',
    "preparedById" TEXT,
    "submittedToICAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "icNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_on_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_add_activities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ValueAddType" NOT NULL,
    "status" "ValueAddStatus" NOT NULL DEFAULT 'PLANNED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "outcome" TEXT,
    "activityDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "value_add_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_valuations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fairValue" DOUBLE PRECISION NOT NULL,
    "previousFairValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "method" "ValuationMethod" NOT NULL,
    "revenueMultiple" DOUBLE PRECISION,
    "comparableSet" TEXT,
    "methodologyNote" TEXT,
    "impliedValuation" DOUBLE PRECISION,
    "navImpact" DOUBLE PRECISION,
    "status" "MarkStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lp_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL DEFAULT 'INDIVIDUAL',
    "jurisdiction" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycCompletedAt" TIMESTAMP(3),
    "kycExpiresAt" TIMESTAMP(3),
    "fatfStatus" "FATFStatus" NOT NULL DEFAULT 'CLEAR',
    "amlClearanceDate" TIMESTAMP(3),
    "pepCheck" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsCheck" BOOLEAN NOT NULL DEFAULT false,
    "agreementSignedAt" TIMESTAMP(3),
    "agreementVersion" TEXT,
    "capitalCommitment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capitalCalled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capitalDistributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unfundedCommitment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "portalAccessGrantedAt" TIMESTAMP(3),
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lp_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_calls" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "callNumber" INTEGER NOT NULL,
    "callDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "CapitalCallStatus" NOT NULL DEFAULT 'DRAFT',
    "wireInstructions" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_call_allocations" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "lpEntityId" TEXT NOT NULL,
    "proRataShare" DOUBLE PRECISION NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_call_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "type" "DistributionType" NOT NULL,
    "description" TEXT,
    "relatedCompanyId" TEXT,
    "waterfallJson" TEXT,
    "taxDocStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_allocations" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "lpEntityId" TEXT NOT NULL,
    "proRataShare" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "returnOfCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredReturn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carry" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "taxWithheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpac_meetings" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "LPACMeetingType" NOT NULL,
    "status" "LPACMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "quorumMet" BOOLEAN NOT NULL DEFAULT false,
    "minutesContent" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lpac_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpac_memberships" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "lpEntityId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "proxy" TEXT,

    CONSTRAINT "lpac_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lpac_resolutions" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "LPACResolutionType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "outcome" "ResolutionOutcome" NOT NULL DEFAULT 'APPROVED',
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lpac_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_operations_reports_companyId_idx" ON "monthly_operations_reports"("companyId");

-- CreateIndex
CREATE INDEX "monthly_operations_reports_period_idx" ON "monthly_operations_reports"("period");

-- CreateIndex
CREATE INDEX "monthly_operations_reports_status_idx" ON "monthly_operations_reports"("status");

-- CreateIndex
CREATE INDEX "monthly_operations_reports_dueDate_idx" ON "monthly_operations_reports"("dueDate");

-- CreateIndex
CREATE INDEX "monthly_operations_reports_submittedById_idx" ON "monthly_operations_reports"("submittedById");

-- CreateIndex
CREATE INDEX "monthly_operations_reports_reviewedById_idx" ON "monthly_operations_reports"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_operations_reports_companyId_period_key" ON "monthly_operations_reports"("companyId", "period");

-- CreateIndex
CREATE INDEX "mor_escalations_companyId_idx" ON "mor_escalations"("companyId");

-- CreateIndex
CREATE INDEX "mor_escalations_morId_idx" ON "mor_escalations"("morId");

-- CreateIndex
CREATE INDEX "mor_escalations_status_idx" ON "mor_escalations"("status");

-- CreateIndex
CREATE INDEX "mor_escalations_severity_idx" ON "mor_escalations"("severity");

-- CreateIndex
CREATE INDEX "mor_escalations_type_idx" ON "mor_escalations"("type");

-- CreateIndex
CREATE INDEX "weekly_kpi_pings_companyId_idx" ON "weekly_kpi_pings"("companyId");

-- CreateIndex
CREATE INDEX "weekly_kpi_pings_week_idx" ON "weekly_kpi_pings"("week");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_kpi_pings_companyId_week_key" ON "weekly_kpi_pings"("companyId", "week");

-- CreateIndex
CREATE INDEX "board_meetings_companyId_idx" ON "board_meetings"("companyId");

-- CreateIndex
CREATE INDEX "board_meetings_meetingDate_idx" ON "board_meetings"("meetingDate");

-- CreateIndex
CREATE INDEX "board_meetings_status_idx" ON "board_meetings"("status");

-- CreateIndex
CREATE INDEX "board_resolutions_meetingId_idx" ON "board_resolutions"("meetingId");

-- CreateIndex
CREATE INDEX "follow_on_notes_companyId_idx" ON "follow_on_notes"("companyId");

-- CreateIndex
CREATE INDEX "follow_on_notes_status_idx" ON "follow_on_notes"("status");

-- CreateIndex
CREATE INDEX "value_add_activities_companyId_idx" ON "value_add_activities"("companyId");

-- CreateIndex
CREATE INDEX "value_add_activities_type_idx" ON "value_add_activities"("type");

-- CreateIndex
CREATE INDEX "value_add_activities_status_idx" ON "value_add_activities"("status");

-- CreateIndex
CREATE INDEX "annual_valuations_companyId_idx" ON "annual_valuations"("companyId");

-- CreateIndex
CREATE INDEX "annual_valuations_year_idx" ON "annual_valuations"("year");

-- CreateIndex
CREATE UNIQUE INDEX "annual_valuations_companyId_year_key" ON "annual_valuations"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "lp_entities_linkedUserId_key" ON "lp_entities"("linkedUserId");

-- CreateIndex
CREATE INDEX "lp_entities_kycStatus_idx" ON "lp_entities"("kycStatus");

-- CreateIndex
CREATE INDEX "lp_entities_fatfStatus_idx" ON "lp_entities"("fatfStatus");

-- CreateIndex
CREATE INDEX "capital_calls_fundId_idx" ON "capital_calls"("fundId");

-- CreateIndex
CREATE INDEX "capital_calls_callDate_idx" ON "capital_calls"("callDate");

-- CreateIndex
CREATE INDEX "capital_calls_status_idx" ON "capital_calls"("status");

-- CreateIndex
CREATE INDEX "capital_call_allocations_callId_idx" ON "capital_call_allocations"("callId");

-- CreateIndex
CREATE INDEX "capital_call_allocations_lpEntityId_idx" ON "capital_call_allocations"("lpEntityId");

-- CreateIndex
CREATE INDEX "capital_call_allocations_status_idx" ON "capital_call_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "capital_call_allocations_callId_lpEntityId_key" ON "capital_call_allocations"("callId", "lpEntityId");

-- CreateIndex
CREATE INDEX "distributions_fundId_idx" ON "distributions"("fundId");

-- CreateIndex
CREATE INDEX "distributions_distributionDate_idx" ON "distributions"("distributionDate");

-- CreateIndex
CREATE INDEX "distributions_type_idx" ON "distributions"("type");

-- CreateIndex
CREATE INDEX "distributions_relatedCompanyId_idx" ON "distributions"("relatedCompanyId");

-- CreateIndex
CREATE INDEX "distribution_allocations_distributionId_idx" ON "distribution_allocations"("distributionId");

-- CreateIndex
CREATE INDEX "distribution_allocations_lpEntityId_idx" ON "distribution_allocations"("lpEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_allocations_distributionId_lpEntityId_key" ON "distribution_allocations"("distributionId", "lpEntityId");

-- CreateIndex
CREATE INDEX "lpac_meetings_fundId_idx" ON "lpac_meetings"("fundId");

-- CreateIndex
CREATE INDEX "lpac_meetings_meetingDate_idx" ON "lpac_meetings"("meetingDate");

-- CreateIndex
CREATE INDEX "lpac_meetings_status_idx" ON "lpac_meetings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lpac_memberships_meetingId_lpEntityId_key" ON "lpac_memberships"("meetingId", "lpEntityId");

-- CreateIndex
CREATE INDEX "lpac_resolutions_meetingId_idx" ON "lpac_resolutions"("meetingId");

-- AddForeignKey
ALTER TABLE "monthly_operations_reports" ADD CONSTRAINT "monthly_operations_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_operations_reports" ADD CONSTRAINT "monthly_operations_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_operations_reports" ADD CONSTRAINT "monthly_operations_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mor_escalations" ADD CONSTRAINT "mor_escalations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mor_escalations" ADD CONSTRAINT "mor_escalations_morId_fkey" FOREIGN KEY ("morId") REFERENCES "monthly_operations_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_kpi_pings" ADD CONSTRAINT "weekly_kpi_pings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_kpi_pings" ADD CONSTRAINT "weekly_kpi_pings_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_meetings" ADD CONSTRAINT "board_meetings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_resolutions" ADD CONSTRAINT "board_resolutions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "board_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_on_notes" ADD CONSTRAINT "follow_on_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_on_notes" ADD CONSTRAINT "follow_on_notes_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_add_activities" ADD CONSTRAINT "value_add_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_add_activities" ADD CONSTRAINT "value_add_activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_valuations" ADD CONSTRAINT "annual_valuations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_valuations" ADD CONSTRAINT "annual_valuations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lp_entities" ADD CONSTRAINT "lp_entities_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_calls" ADD CONSTRAINT "capital_calls_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_call_allocations" ADD CONSTRAINT "capital_call_allocations_callId_fkey" FOREIGN KEY ("callId") REFERENCES "capital_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_call_allocations" ADD CONSTRAINT "capital_call_allocations_lpEntityId_fkey" FOREIGN KEY ("lpEntityId") REFERENCES "lp_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "distributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_allocations" ADD CONSTRAINT "distribution_allocations_lpEntityId_fkey" FOREIGN KEY ("lpEntityId") REFERENCES "lp_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpac_meetings" ADD CONSTRAINT "lpac_meetings_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpac_memberships" ADD CONSTRAINT "lpac_memberships_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "lpac_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpac_memberships" ADD CONSTRAINT "lpac_memberships_lpEntityId_fkey" FOREIGN KEY ("lpEntityId") REFERENCES "lp_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lpac_resolutions" ADD CONSTRAINT "lpac_resolutions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "lpac_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
