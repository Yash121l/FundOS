'use server'

import { db } from '@fundos/database'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'

// ── Module B: Income Statement ────────────────────────────────

export interface IncomeStatementData {
  companyId: string
  period: string
  subscriptionRevenue: number | null
  servicesRevenue: number | null
  otherRevenue: number | null
  cogsHosting: number | null
  cogsSupport: number | null
  cogsServices: number | null
  cogsOther: number | null
  smSalaries: number | null
  smPrograms: number | null
  rdSalaries: number | null
  rdContractors: number | null
  rdTools: number | null
  gaSalaries: number | null
  gaLegal: number | null
  gaInsurance: number | null
  gaOther: number | null
  depreciation: number | null
  interestExpense: number | null
  interestIncome: number | null
  stockBasedComp: number | null
}

export async function saveIncomeStatement(data: IncomeStatementData): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PM' && user.role !== 'ANALYST')) {
    return { success: false }
  }

  const { companyId, period, ...rest } = data

  await db.incomeStatement.upsert({
    where: { companyId_period: { companyId, period } },
    create: { companyId, period, ...rest },
    update: rest,
  })

  revalidatePath(`/portfolio/${companyId}`)
  return { success: true }
}

export async function deleteIncomeStatement(companyId: string, period: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PM' && user.role !== 'ANALYST')) {
    return { success: false }
  }

  await db.incomeStatement.deleteMany({ where: { companyId, period } })
  revalidatePath(`/portfolio/${companyId}`)
  return { success: true }
}

// ── Module B: Balance Sheet ───────────────────────────────────

export interface BalanceSheetData {
  companyId: string
  period: string
  cash: number | null
  shortTermInvestments: number | null
  accountsReceivable: number | null
  prepaidExpenses: number | null
  otherCurrentAssets: number | null
  ppe: number | null
  capitalizedSoftware: number | null
  rightOfUseAssets: number | null
  goodwill: number | null
  otherNonCurrentAssets: number | null
  accountsPayable: number | null
  accruedLiabilities: number | null
  deferredRevenueCurrent: number | null
  shortTermDebt: number | null
  otherCurrentLiabilities: number | null
  longTermDebt: number | null
  deferredRevenueLongTerm: number | null
  operatingLeaseLiabilities: number | null
  commonStock: number | null
  additionalPaidInCapital: number | null
  accumulatedDeficit: number | null
  retainedEarnings: number | null
}

export async function saveBalanceSheet(data: BalanceSheetData): Promise<{ success: boolean }> {
  const { companyId, period, ...rest } = data

  await db.balanceSheet.upsert({
    where: { companyId_period: { companyId, period } },
    create: { companyId, period, ...rest },
    update: rest,
  })

  revalidatePath(`/portfolio/${companyId}`)
  return { success: true }
}

// ── Module B: Cash Flow Statement ────────────────────────────

export interface CashFlowData {
  companyId: string
  period: string
  cfDepreciation: number | null
  cfStockBasedComp: number | null
  cfArChange: number | null
  cfDeferredRevenueChange: number | null
  cfApChange: number | null
  cfAccruedLiabilitiesChange: number | null
  cfPrepaidChange: number | null
  cfCapex: number | null
  cfCapitalizedSoftware: number | null
  cfAcquisitions: number | null
  cfEquityProceeds: number | null
  cfDebtProceeds: number | null
  cfDebtRepayment: number | null
  cfOptionExercises: number | null
  beginningCash: number | null
}

export async function saveCashFlow(data: CashFlowData): Promise<{ success: boolean }> {
  const { companyId, period, ...rest } = data

  await db.cashFlowStatement.upsert({
    where: { companyId_period: { companyId, period } },
    create: { companyId, period, ...rest },
    update: rest,
  })

  revalidatePath(`/portfolio/${companyId}`)
  return { success: true }
}

// ── Module B: Budget ──────────────────────────────────────────

export interface BudgetData {
  companyId: string
  year: number
  subscriptionRevenue: number | null
  servicesRevenue: number | null
  otherRevenue: number | null
  cogsHosting: number | null
  cogsSupport: number | null
  cogsServices: number | null
  cogsOther: number | null
  smSalaries: number | null
  smPrograms: number | null
  rdSalaries: number | null
  rdContractors: number | null
  rdTools: number | null
  gaSalaries: number | null
  gaLegal: number | null
  gaInsurance: number | null
  gaOther: number | null
}

export async function saveBudget(data: BudgetData): Promise<{ success: boolean }> {
  const { companyId, year, ...rest } = data

  await db.incomeStatementBudget.upsert({
    where: { companyId_year: { companyId, year } },
    create: { companyId, year, ...rest },
    update: rest,
  })

  revalidatePath(`/portfolio/${companyId}`)
  return { success: true }
}
