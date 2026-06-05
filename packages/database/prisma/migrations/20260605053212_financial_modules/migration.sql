-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('SAFE', 'CONVERTIBLE_NOTE', 'PRICED_EQUITY', 'GRANT', 'DEBT');

-- CreateEnum
CREATE TYPE "SecurityType" AS ENUM ('SAFE', 'CONVERTIBLE_NOTE', 'PREFERRED', 'COMMON', 'WARRANT');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('LAST_ROUND', 'ARR_MULTIPLE', 'DCF', 'PWERM', 'OPM', 'NET_ASSETS');

-- CreateEnum
CREATE TYPE "MarkStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED');

-- CreateEnum
CREATE TYPE "SafeType" AS ENUM ('PRE_MONEY', 'POST_MONEY');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('OUTSTANDING', 'CONVERTED', 'REPAID', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "HolderType" AS ENUM ('FOUNDER', 'INVESTOR', 'EMPLOYEE', 'OPTION_POOL', 'WARRANT');

-- CreateEnum
CREATE TYPE "AntiDilution" AS ENUM ('NONE', 'WEIGHTED_AVERAGE_BROAD', 'WEIGHTED_AVERAGE_NARROW', 'FULL_RATCHET');

-- CreateEnum
CREATE TYPE "CapitalActivityType" AS ENUM ('CAPITAL_CALL', 'DISTRIBUTION', 'MANAGEMENT_FEE', 'FUND_EXPENSE', 'CARRIED_INTEREST');

-- CreateEnum
CREATE TYPE "WaterfallType" AS ENUM ('AMERICAN', 'EUROPEAN');

-- AlterTable
ALTER TABLE "metric_snapshots" ADD COLUMN     "grr" DOUBLE PRECISION,
ADD COLUMN     "logoChurnAnnual" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ANALYST';

-- CreateTable
CREATE TABLE "mrr_bridges" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "beginningMrr" DOUBLE PRECISION NOT NULL,
    "newMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expansionMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reactivationMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractionMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnedMrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endingMrr" DOUBLE PRECISION NOT NULL,
    "newCustomers" INTEGER,
    "churnedCustomers" INTEGER,
    "totalCustomers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mrr_bridges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_economics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "cac" DOUBLE PRECISION,
    "ltv" DOUBLE PRECISION,
    "ltvCacRatio" DOUBLE PRECISION,
    "cacPaybackMonths" DOUBLE PRECISION,
    "arpa" DOUBLE PRECISION,
    "acv" DOUBLE PRECISION,
    "asp" DOUBLE PRECISION,
    "newCacRatio" DOUBLE PRECISION,
    "expansionCacRatio" DOUBLE PRECISION,
    "burnMultiple" DOUBLE PRECISION,
    "ruleOf40" DOUBLE PRECISION,
    "magicNumber" DOUBLE PRECISION,
    "bessemerEfficiency" DOUBLE PRECISION,
    "cashConversionScore" DOUBLE PRECISION,
    "smSpend" DOUBLE PRECISION,
    "newCustomers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_economics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "subscriptionRevenue" DOUBLE PRECISION,
    "servicesRevenue" DOUBLE PRECISION,
    "otherRevenue" DOUBLE PRECISION,
    "cogsHosting" DOUBLE PRECISION,
    "cogsSupport" DOUBLE PRECISION,
    "cogsServices" DOUBLE PRECISION,
    "cogsOther" DOUBLE PRECISION,
    "smSalaries" DOUBLE PRECISION,
    "smPrograms" DOUBLE PRECISION,
    "rdSalaries" DOUBLE PRECISION,
    "rdContractors" DOUBLE PRECISION,
    "rdTools" DOUBLE PRECISION,
    "gaSalaries" DOUBLE PRECISION,
    "gaLegal" DOUBLE PRECISION,
    "gaInsurance" DOUBLE PRECISION,
    "gaOther" DOUBLE PRECISION,
    "depreciation" DOUBLE PRECISION,
    "interestExpense" DOUBLE PRECISION,
    "interestIncome" DOUBLE PRECISION,
    "stockBasedComp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_statement_budgets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "subscriptionRevenue" DOUBLE PRECISION,
    "servicesRevenue" DOUBLE PRECISION,
    "otherRevenue" DOUBLE PRECISION,
    "cogsHosting" DOUBLE PRECISION,
    "cogsSupport" DOUBLE PRECISION,
    "cogsServices" DOUBLE PRECISION,
    "cogsOther" DOUBLE PRECISION,
    "smSalaries" DOUBLE PRECISION,
    "smPrograms" DOUBLE PRECISION,
    "rdSalaries" DOUBLE PRECISION,
    "rdContractors" DOUBLE PRECISION,
    "rdTools" DOUBLE PRECISION,
    "gaSalaries" DOUBLE PRECISION,
    "gaLegal" DOUBLE PRECISION,
    "gaInsurance" DOUBLE PRECISION,
    "gaOther" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_statement_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "cash" DOUBLE PRECISION,
    "shortTermInvestments" DOUBLE PRECISION,
    "accountsReceivable" DOUBLE PRECISION,
    "prepaidExpenses" DOUBLE PRECISION,
    "otherCurrentAssets" DOUBLE PRECISION,
    "ppe" DOUBLE PRECISION,
    "capitalizedSoftware" DOUBLE PRECISION,
    "rightOfUseAssets" DOUBLE PRECISION,
    "goodwill" DOUBLE PRECISION,
    "otherNonCurrentAssets" DOUBLE PRECISION,
    "accountsPayable" DOUBLE PRECISION,
    "accruedLiabilities" DOUBLE PRECISION,
    "deferredRevenueCurrent" DOUBLE PRECISION,
    "shortTermDebt" DOUBLE PRECISION,
    "otherCurrentLiabilities" DOUBLE PRECISION,
    "longTermDebt" DOUBLE PRECISION,
    "deferredRevenueLongTerm" DOUBLE PRECISION,
    "operatingLeaseLiabilities" DOUBLE PRECISION,
    "commonStock" DOUBLE PRECISION,
    "additionalPaidInCapital" DOUBLE PRECISION,
    "accumulatedDeficit" DOUBLE PRECISION,
    "retainedEarnings" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "cfDepreciation" DOUBLE PRECISION,
    "cfStockBasedComp" DOUBLE PRECISION,
    "cfArChange" DOUBLE PRECISION,
    "cfDeferredRevenueChange" DOUBLE PRECISION,
    "cfApChange" DOUBLE PRECISION,
    "cfAccruedLiabilitiesChange" DOUBLE PRECISION,
    "cfPrepaidChange" DOUBLE PRECISION,
    "cfCapex" DOUBLE PRECISION,
    "cfCapitalizedSoftware" DOUBLE PRECISION,
    "cfAcquisitions" DOUBLE PRECISION,
    "cfEquityProceeds" DOUBLE PRECISION,
    "cfDebtProceeds" DOUBLE PRECISION,
    "cfDebtRepayment" DOUBLE PRECISION,
    "cfOptionExercises" DOUBLE PRECISION,
    "beginningCash" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_rounds" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundType" "RoundType" NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "preMoney" DOUBLE PRECISION,
    "postMoney" DOUBLE PRECISION,
    "roundSize" DOUBLE PRECISION,
    "pricePerShare" DOUBLE PRECISION,
    "shareClass" TEXT,
    "optionPoolPct" DOUBLE PRECISION,
    "leadInvestor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_investments" (
    "id" TEXT NOT NULL,
    "roundId" TEXT,
    "companyId" TEXT NOT NULL,
    "investmentDate" TIMESTAMP(3) NOT NULL,
    "securityType" "SecurityType" NOT NULL,
    "amountInvested" DOUBLE PRECISION NOT NULL,
    "sharesAcquired" DOUBLE PRECISION,
    "entryPricePerShare" DOUBLE PRECISION,
    "ownershipPctBasic" DOUBLE PRECISION,
    "ownershipPctFullyDiluted" DOUBLE PRECISION,
    "proRataRight" BOOLEAN NOT NULL DEFAULT false,
    "boardSeat" BOOLEAN NOT NULL DEFAULT false,
    "boardObserver" BOOLEAN NOT NULL DEFAULT false,
    "followOnReserve" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_marks" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "markDate" TIMESTAMP(3) NOT NULL,
    "fairValue" DOUBLE PRECISION NOT NULL,
    "valuationMethod" "ValuationMethod" NOT NULL,
    "methodologyNote" TEXT,
    "revenueMultipleUsed" DOUBLE PRECISION,
    "comparableSet" TEXT,
    "impliedValuation" DOUBLE PRECISION,
    "status" "MarkStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valuation_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cap_table_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundId" TEXT,
    "holderName" TEXT NOT NULL,
    "holderType" "HolderType" NOT NULL,
    "shareClass" TEXT NOT NULL,
    "sharesIssued" DOUBLE PRECISION NOT NULL,
    "ownershipPctBasic" DOUBLE PRECISION,
    "ownershipPctFullyDiluted" DOUBLE PRECISION,
    "liquidationPreference" DOUBLE PRECISION,
    "participating" BOOLEAN NOT NULL DEFAULT false,
    "antiDilution" "AntiDilution" NOT NULL DEFAULT 'NONE',
    "votingRightsPerShare" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "boardSeat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cap_table_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_notes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "safeType" "SafeType" NOT NULL DEFAULT 'POST_MONEY',
    "valuationCap" DOUBLE PRECISION,
    "discountRate" DOUBLE PRECISION,
    "mfn" BOOLEAN NOT NULL DEFAULT false,
    "proRataRight" BOOLEAN NOT NULL DEFAULT false,
    "triggerAmount" DOUBLE PRECISION,
    "status" "NoteStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "conversionRoundId" TEXT,
    "sharesIssuedOnConversion" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safe_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convertible_notes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "interestRate" DOUBLE PRECISION,
    "interestType" TEXT,
    "valuationCap" DOUBLE PRECISION,
    "discountRate" DOUBLE PRECISION,
    "mfn" BOOLEAN NOT NULL DEFAULT false,
    "status" "NoteStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "conversionRoundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convertible_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_pools" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundId" TEXT,
    "authorizedShares" DOUBLE PRECISION NOT NULL,
    "grantedShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vestedShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exercisedShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "option_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vintage" INTEGER NOT NULL,
    "committedCapital" DOUBLE PRECISION NOT NULL,
    "managementFeePct" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "carryPct" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "hurdleRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "waterfallType" "WaterfallType" NOT NULL DEFAULT 'EUROPEAN',
    "investmentPeriodEnd" TIMESTAMP(3),
    "fundTermEnd" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_activities" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "CapitalActivityType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "lpName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capital_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mrr_bridges_companyId_idx" ON "mrr_bridges"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "mrr_bridges_companyId_period_key" ON "mrr_bridges"("companyId", "period");

-- CreateIndex
CREATE INDEX "unit_economics_companyId_idx" ON "unit_economics"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_economics_companyId_period_key" ON "unit_economics"("companyId", "period");

-- CreateIndex
CREATE INDEX "income_statements_companyId_idx" ON "income_statements"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "income_statements_companyId_period_key" ON "income_statements"("companyId", "period");

-- CreateIndex
CREATE INDEX "income_statement_budgets_companyId_idx" ON "income_statement_budgets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "income_statement_budgets_companyId_year_key" ON "income_statement_budgets"("companyId", "year");

-- CreateIndex
CREATE INDEX "balance_sheets_companyId_idx" ON "balance_sheets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheets_companyId_period_key" ON "balance_sheets"("companyId", "period");

-- CreateIndex
CREATE INDEX "cash_flow_statements_companyId_idx" ON "cash_flow_statements"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_statements_companyId_period_key" ON "cash_flow_statements"("companyId", "period");

-- CreateIndex
CREATE INDEX "funding_rounds_companyId_idx" ON "funding_rounds"("companyId");

-- CreateIndex
CREATE INDEX "fund_investments_companyId_idx" ON "fund_investments"("companyId");

-- CreateIndex
CREATE INDEX "fund_investments_roundId_idx" ON "fund_investments"("roundId");

-- CreateIndex
CREATE INDEX "valuation_marks_investmentId_idx" ON "valuation_marks"("investmentId");

-- CreateIndex
CREATE INDEX "valuation_marks_companyId_idx" ON "valuation_marks"("companyId");

-- CreateIndex
CREATE INDEX "valuation_marks_markDate_idx" ON "valuation_marks"("markDate");

-- CreateIndex
CREATE INDEX "cap_table_entries_companyId_idx" ON "cap_table_entries"("companyId");

-- CreateIndex
CREATE INDEX "cap_table_entries_roundId_idx" ON "cap_table_entries"("roundId");

-- CreateIndex
CREATE INDEX "safe_notes_companyId_idx" ON "safe_notes"("companyId");

-- CreateIndex
CREATE INDEX "convertible_notes_companyId_idx" ON "convertible_notes"("companyId");

-- CreateIndex
CREATE INDEX "option_pools_companyId_idx" ON "option_pools"("companyId");

-- CreateIndex
CREATE INDEX "option_pools_roundId_idx" ON "option_pools"("roundId");

-- CreateIndex
CREATE INDEX "capital_activities_fundId_idx" ON "capital_activities"("fundId");

-- CreateIndex
CREATE INDEX "capital_activities_date_idx" ON "capital_activities"("date");

-- CreateIndex
CREATE INDEX "capital_activities_type_idx" ON "capital_activities"("type");

-- AddForeignKey
ALTER TABLE "mrr_bridges" ADD CONSTRAINT "mrr_bridges_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_economics" ADD CONSTRAINT "unit_economics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_statements" ADD CONSTRAINT "income_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_statement_budgets" ADD CONSTRAINT "income_statement_budgets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheets" ADD CONSTRAINT "balance_sheets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_statements" ADD CONSTRAINT "cash_flow_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_rounds" ADD CONSTRAINT "funding_rounds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_investments" ADD CONSTRAINT "fund_investments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_investments" ADD CONSTRAINT "fund_investments_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "funding_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_marks" ADD CONSTRAINT "valuation_marks_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "fund_investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_marks" ADD CONSTRAINT "valuation_marks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_table_entries" ADD CONSTRAINT "cap_table_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_table_entries" ADD CONSTRAINT "cap_table_entries_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "funding_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_notes" ADD CONSTRAINT "safe_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_notes" ADD CONSTRAINT "safe_notes_conversionRoundId_fkey" FOREIGN KEY ("conversionRoundId") REFERENCES "funding_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "safe_notes_conversionRoundId_idx" ON "safe_notes"("conversionRoundId");

-- AddForeignKey
ALTER TABLE "convertible_notes" ADD CONSTRAINT "convertible_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convertible_notes" ADD CONSTRAINT "convertible_notes_conversionRoundId_fkey" FOREIGN KEY ("conversionRoundId") REFERENCES "funding_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "convertible_notes_conversionRoundId_idx" ON "convertible_notes"("conversionRoundId");

-- AddForeignKey
ALTER TABLE "option_pools" ADD CONSTRAINT "option_pools_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_activities" ADD CONSTRAINT "capital_activities_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
