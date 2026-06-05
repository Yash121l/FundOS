import { db } from '@fundos/database'

// ── Module B: Financial Statements ───────────────────────────

export async function getFinancialStatements(companyId: string) {
  const [incomeStatements, balanceSheets, cashFlows, budgets] = await Promise.all([
    db.incomeStatement.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 12,
    }),
    db.balanceSheet.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 8,
    }),
    db.cashFlowStatement.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 12,
    }),
    db.incomeStatementBudget.findMany({
      where: { companyId },
      orderBy: { year: 'desc' },
      take: 3,
    }),
  ])

  return { incomeStatements, balanceSheets, cashFlows, budgets }
}

export type FinancialStatements = Awaited<ReturnType<typeof getFinancialStatements>>
export type IncomeStatementRow = FinancialStatements['incomeStatements'][number]
export type BalanceSheetRow = FinancialStatements['balanceSheets'][number]
export type CashFlowRow = FinancialStatements['cashFlows'][number]

// ── Module C: SaaS Metrics ────────────────────────────────────

export async function getSaasMetrics(companyId: string) {
  const [mrrBridges, unitEconomics] = await Promise.all([
    db.mrrBridge.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 12,
    }),
    db.unitEconomics.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 12,
    }),
  ])

  return { mrrBridges, unitEconomics }
}

export type SaasMetrics = Awaited<ReturnType<typeof getSaasMetrics>>
export type MrrBridgeRow = SaasMetrics['mrrBridges'][number]
export type UnitEconomicsRow = SaasMetrics['unitEconomics'][number]

// ── Auto-computed helpers ─────────────────────────────────────

export function computeIncomeStatement(row: IncomeStatementRow) {
  const totalRevenue = (row.subscriptionRevenue ?? 0) + (row.servicesRevenue ?? 0) + (row.otherRevenue ?? 0)
  const totalCogs = (row.cogsHosting ?? 0) + (row.cogsSupport ?? 0) + (row.cogsServices ?? 0) + (row.cogsOther ?? 0)
  const grossProfit = totalRevenue - totalCogs
  const grossMarginPct = totalRevenue > 0 ? grossProfit / totalRevenue : null

  const totalSm = (row.smSalaries ?? 0) + (row.smPrograms ?? 0)
  const totalRd = (row.rdSalaries ?? 0) + (row.rdContractors ?? 0) + (row.rdTools ?? 0)
  const totalGa = (row.gaSalaries ?? 0) + (row.gaLegal ?? 0) + (row.gaInsurance ?? 0) + (row.gaOther ?? 0)
  const totalOpex = totalSm + totalRd + totalGa

  const ebitda = grossProfit - totalOpex
  const ebit = ebitda - (row.depreciation ?? 0)
  const netIncome = ebit - (row.interestExpense ?? 0) + (row.interestIncome ?? 0)
  const adjustedEbitda = ebitda + (row.stockBasedComp ?? 0)

  return {
    totalRevenue, totalCogs, grossProfit, grossMarginPct,
    totalSm, totalRd, totalGa, totalOpex,
    ebitda, ebit, netIncome, adjustedEbitda,
  }
}

export function computeBalanceSheet(row: BalanceSheetRow) {
  const totalCurrentAssets =
    (row.cash ?? 0) + (row.shortTermInvestments ?? 0) + (row.accountsReceivable ?? 0) +
    (row.prepaidExpenses ?? 0) + (row.otherCurrentAssets ?? 0)
  const totalNonCurrentAssets =
    (row.ppe ?? 0) + (row.capitalizedSoftware ?? 0) + (row.rightOfUseAssets ?? 0) +
    (row.goodwill ?? 0) + (row.otherNonCurrentAssets ?? 0)
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets

  const totalCurrentLiabilities =
    (row.accountsPayable ?? 0) + (row.accruedLiabilities ?? 0) +
    (row.deferredRevenueCurrent ?? 0) + (row.shortTermDebt ?? 0) + (row.otherCurrentLiabilities ?? 0)
  const totalNonCurrentLiabilities =
    (row.longTermDebt ?? 0) + (row.deferredRevenueLongTerm ?? 0) + (row.operatingLeaseLiabilities ?? 0)
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities

  const totalEquity =
    (row.commonStock ?? 0) + (row.additionalPaidInCapital ?? 0) -
    (row.accumulatedDeficit ?? 0) + (row.retainedEarnings ?? 0)

  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : null
  const quickRatio = totalCurrentLiabilities > 0
    ? ((row.cash ?? 0) + (row.shortTermInvestments ?? 0) + (row.accountsReceivable ?? 0)) / totalCurrentLiabilities
    : null
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities

  return {
    totalCurrentAssets, totalNonCurrentAssets, totalAssets,
    totalCurrentLiabilities, totalNonCurrentLiabilities, totalLiabilities,
    totalEquity, currentRatio, quickRatio, workingCapital,
  }
}

export function computeCashFlow(row: CashFlowRow, netIncome: number) {
  const cfOperating =
    netIncome +
    (row.cfDepreciation ?? 0) +
    (row.cfStockBasedComp ?? 0) -
    (row.cfArChange ?? 0) +
    (row.cfDeferredRevenueChange ?? 0) +
    (row.cfApChange ?? 0) +
    (row.cfAccruedLiabilitiesChange ?? 0) -
    (row.cfPrepaidChange ?? 0)

  const cfInvesting =
    -(row.cfCapex ?? 0) -
    (row.cfCapitalizedSoftware ?? 0) -
    (row.cfAcquisitions ?? 0)

  const cfFinancing =
    (row.cfEquityProceeds ?? 0) +
    (row.cfDebtProceeds ?? 0) -
    (row.cfDebtRepayment ?? 0) +
    (row.cfOptionExercises ?? 0)

  const netCashChange = cfOperating + cfInvesting + cfFinancing
  const endingCash = (row.beginningCash ?? 0) + netCashChange

  return { cfOperating, cfInvesting, cfFinancing, netCashChange, endingCash }
}

export function computeMrrBridgeDerived(row: MrrBridgeRow) {
  const grossRevChurn =
    row.beginningMrr > 0
      ? (row.churnedMrr + row.contractionMrr) / row.beginningMrr
      : null
  const netRevChurn =
    row.beginningMrr > 0
      ? (row.churnedMrr + row.contractionMrr - row.expansionMrr - row.reactivationMrr) / row.beginningMrr
      : null
  const denominator = row.churnedMrr + row.contractionMrr
  const quickRatio = denominator > 0
    ? (row.newMrr + row.expansionMrr + row.reactivationMrr) / denominator
    : null

  return { grossRevChurn, netRevChurn, quickRatio }
}
