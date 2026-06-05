'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, FileText, Plus } from 'lucide-react'
import { formatCurrency, formatPeriod, getPeriodOptions } from '@fundos/shared'
import {
  computeIncomeStatement, computeBalanceSheet, computeCashFlow,
  type FinancialStatements,
} from '@/lib/financial'
import {
  saveIncomeStatement, saveBalanceSheet, saveCashFlow,
  type IncomeStatementData, type BalanceSheetData, type CashFlowData,
} from '@/lib/financial-actions'
import { cn } from '@/lib/utils'

interface Props {
  companyId: string
  statements: FinancialStatements
}

type Tab = 'pl' | 'bs' | 'cf'

function fm(v: number | null | undefined) {
  if (v == null) return '—'
  return formatCurrency(v, true)
}

function fmColor(v: number | null | undefined) {
  if (v == null) return 'text-muted-foreground'
  return v >= 0 ? 'text-foreground' : 'text-red-400'
}

function Row({ label, value, bold, indent, color }: { label: string; value: string; bold?: boolean; indent?: boolean; color?: string }) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
      <td className={cn('py-1.5 text-[12px] pr-4', indent && 'pl-4 text-muted-foreground', bold && 'font-semibold')}>{label}</td>
      <td className={cn('py-1.5 text-[12px] text-right tabular-nums font-mono', bold && 'font-semibold', color ?? fmColor(null))}>{value}</td>
    </tr>
  )
}

// ── Income Statement ───────────────────────────────────────────

function IncomeStatementTab({ companyId, statements }: { companyId: string; statements: FinancialStatements }) {
  const [selected, setSelected] = useState(statements.incomeStatements[0]?.period ?? '')
  const [showForm, setShowForm] = useState(false)

  const row = statements.incomeStatements.find((r) => r.period === selected)
  const computed = row ? computeIncomeStatement(row) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input h-7 text-[12px]">
          {statements.incomeStatements.map((r) => (
            <option key={r.period} value={r.period}>{formatPeriod(r.period)}</option>
          ))}
        </select>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Log P&L
        </button>
      </div>

      {!row || !computed ? (
        <div className="py-8 text-center text-[13px] text-muted-foreground">No income statement data. Click "Log P&L" to add.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-secondary/40 border-b border-border">
              <th className="py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Line Item</th>
              <th className="py-2 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{formatPeriod(row.period)}</th>
            </tr></thead>
            <tbody className="px-3">
              <Row label="Subscription Revenue" value={fm(row.subscriptionRevenue)} indent />
              <Row label="Services Revenue" value={fm(row.servicesRevenue)} indent />
              <Row label="Other Revenue" value={fm(row.otherRevenue)} indent />
              <Row label="Total Revenue" value={fm(computed.totalRevenue)} bold color={fmColor(computed.totalRevenue)} />
              <Row label="COGS" value={fm(computed.totalCogs)} indent color="text-red-400/80" />
              <Row label="Gross Profit" value={fm(computed.grossProfit)} bold color={fmColor(computed.grossProfit)} />
              <Row label={`Gross Margin`} value={computed.grossMarginPct != null ? `${(computed.grossMarginPct * 100).toFixed(1)}%` : '—'} indent />
              <Row label="S&M" value={fm(computed.totalSm)} indent color="text-muted-foreground" />
              <Row label="R&D" value={fm(computed.totalRd)} indent color="text-muted-foreground" />
              <Row label="G&A" value={fm(computed.totalGa)} indent color="text-muted-foreground" />
              <Row label="Total OpEx" value={fm(computed.totalOpex)} bold color="text-red-400/80" />
              <Row label="EBITDA" value={fm(computed.ebitda)} bold color={fmColor(computed.ebitda)} />
              <Row label="Adjusted EBITDA" value={fm(computed.adjustedEbitda)} indent color={fmColor(computed.adjustedEbitda)} />
              <Row label="Depreciation" value={fm(row.depreciation)} indent color="text-muted-foreground" />
              <Row label="EBIT" value={fm(computed.ebit)} bold color={fmColor(computed.ebit)} />
              <Row label="Interest Expense" value={fm(row.interestExpense)} indent color="text-muted-foreground" />
              <Row label="Net Income" value={fm(computed.netIncome)} bold color={fmColor(computed.netIncome)} />
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <IncomeStatementForm companyId={companyId} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ── Balance Sheet ──────────────────────────────────────────────

function BalanceSheetTab({ companyId, statements }: { companyId: string; statements: FinancialStatements }) {
  const [selected, setSelected] = useState(statements.balanceSheets[0]?.period ?? '')
  const [showForm, setShowForm] = useState(false)

  const row = statements.balanceSheets.find((r) => r.period === selected)
  const computed = row ? computeBalanceSheet(row) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input h-7 text-[12px]">
          {statements.balanceSheets.map((r) => (
            <option key={r.period} value={r.period}>{formatPeriod(r.period)}</option>
          ))}
        </select>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Log Balance Sheet
        </button>
      </div>

      {!row || !computed ? (
        <div className="py-8 text-center text-[13px] text-muted-foreground">No balance sheet data.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-secondary/40 border-b border-border">
              <th className="py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Line Item</th>
              <th className="py-2 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{formatPeriod(row.period)}</th>
            </tr></thead>
            <tbody>
              <Row label="Cash & Equivalents" value={fm(row.cash)} indent />
              <Row label="Short-term Investments" value={fm(row.shortTermInvestments)} indent />
              <Row label="Accounts Receivable" value={fm(row.accountsReceivable)} indent />
              <Row label="Prepaid Expenses" value={fm(row.prepaidExpenses)} indent />
              <Row label="Total Current Assets" value={fm(computed.totalCurrentAssets)} bold />
              <Row label="PP&E (net)" value={fm(row.ppe)} indent />
              <Row label="Capitalized Software" value={fm(row.capitalizedSoftware)} indent />
              <Row label="Goodwill" value={fm(row.goodwill)} indent />
              <Row label="Total Assets" value={fm(computed.totalAssets)} bold />
              <Row label="Accounts Payable" value={fm(row.accountsPayable)} indent />
              <Row label="Deferred Revenue (current)" value={fm(row.deferredRevenueCurrent)} indent />
              <Row label="Short-term Debt" value={fm(row.shortTermDebt)} indent />
              <Row label="Total Current Liabilities" value={fm(computed.totalCurrentLiabilities)} bold />
              <Row label="Long-term Debt" value={fm(row.longTermDebt)} indent />
              <Row label="Total Liabilities" value={fm(computed.totalLiabilities)} bold />
              <Row label="Stockholders' Equity" value={fm(computed.totalEquity)} bold color={fmColor(computed.totalEquity)} />
              <Row label="Current Ratio" value={computed.currentRatio != null ? computed.currentRatio.toFixed(2) : '—'} indent color={computed.currentRatio != null ? (computed.currentRatio >= 1.5 ? 'text-emerald-400' : 'text-amber-400') : 'text-muted-foreground'} />
              <Row label="Quick Ratio" value={computed.quickRatio != null ? computed.quickRatio.toFixed(2) : '—'} indent />
            </tbody>
          </table>
        </div>
      )}

      {showForm && <BalanceSheetForm companyId={companyId} onClose={() => setShowForm(false)} />}
    </div>
  )
}

// ── Cash Flow ──────────────────────────────────────────────────

function CashFlowTab({ companyId, statements }: { companyId: string; statements: FinancialStatements }) {
  const [selected, setSelected] = useState(statements.cashFlows[0]?.period ?? '')
  const [showForm, setShowForm] = useState(false)

  const cfRow = statements.cashFlows.find((r) => r.period === selected)
  const isRow = statements.incomeStatements.find((r) => r.period === selected)
  const netIncome = isRow ? computeIncomeStatement(isRow).netIncome : 0
  const computed = cfRow ? computeCashFlow(cfRow, netIncome) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input h-7 text-[12px]">
          {statements.cashFlows.map((r) => (
            <option key={r.period} value={r.period}>{formatPeriod(r.period)}</option>
          ))}
        </select>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Plus size={12} /> Log Cash Flow
        </button>
      </div>

      {!cfRow || !computed ? (
        <div className="py-8 text-center text-[13px] text-muted-foreground">No cash flow data.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-secondary/40 border-b border-border">
              <th className="py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Line Item</th>
              <th className="py-2 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{formatPeriod(cfRow.period)}</th>
            </tr></thead>
            <tbody>
              <Row label="Net Income" value={fm(netIncome)} indent />
              <Row label="Depreciation & Amortization" value={fm(cfRow.cfDepreciation)} indent />
              <Row label="Stock-Based Compensation" value={fm(cfRow.cfStockBasedComp)} indent />
              <Row label="Net Cash from Operations" value={fm(computed.cfOperating)} bold color={fmColor(computed.cfOperating)} />
              <Row label="Capital Expenditures" value={cfRow.cfCapex != null ? fm(-cfRow.cfCapex) : '—'} indent />
              <Row label="Net Cash from Investing" value={fm(computed.cfInvesting)} bold color={fmColor(computed.cfInvesting)} />
              <Row label="Equity Proceeds" value={fm(cfRow.cfEquityProceeds)} indent />
              <Row label="Debt Proceeds" value={fm(cfRow.cfDebtProceeds)} indent />
              <Row label="Debt Repayment" value={cfRow.cfDebtRepayment != null ? fm(-cfRow.cfDebtRepayment) : '—'} indent />
              <Row label="Net Cash from Financing" value={fm(computed.cfFinancing)} bold color={fmColor(computed.cfFinancing)} />
              <Row label="Net Change in Cash" value={fm(computed.netCashChange)} bold color={fmColor(computed.netCashChange)} />
              <Row label="Beginning Cash" value={fm(cfRow.beginningCash)} indent />
              <Row label="Ending Cash" value={fm(computed.endingCash)} bold />
            </tbody>
          </table>
        </div>
      )}

      {showForm && <CashFlowForm companyId={companyId} onClose={() => setShowForm(false)} />}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export function FinancialStatementsView({ companyId, statements }: Props) {
  const [tab, setTab] = useState<Tab>('pl')

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-medium flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          Financial Statements
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(['pl', 'bs', 'cf'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('h-6 px-3 rounded-md text-[11px] font-medium transition-colors', tab === t ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {t === 'pl' ? 'P&L' : t === 'bs' ? 'Balance Sheet' : 'Cash Flow'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pl' && <IncomeStatementTab companyId={companyId} statements={statements} />}
      {tab === 'bs' && <BalanceSheetTab companyId={companyId} statements={statements} />}
      {tab === 'cf' && <CashFlowTab companyId={companyId} statements={statements} />}
    </div>
  )
}

// ── Entry forms ────────────────────────────────────────────────

function IncomeStatementForm({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const periods = getPeriodOptions(12)
  const [period, setPeriod] = useState(periods[0] ?? '')

  const fields: Array<{ k: keyof IncomeStatementData; label: string }> = [
    { k: 'subscriptionRevenue', label: 'Subscription Revenue' },
    { k: 'servicesRevenue', label: 'Services Revenue' },
    { k: 'otherRevenue', label: 'Other Revenue' },
    { k: 'cogsHosting', label: 'COGS — Hosting' },
    { k: 'cogsSupport', label: 'COGS — Support' },
    { k: 'cogsServices', label: 'COGS — Services' },
    { k: 'cogsOther', label: 'COGS — Other' },
    { k: 'smSalaries', label: 'S&M — Salaries' },
    { k: 'smPrograms', label: 'S&M — Programs' },
    { k: 'rdSalaries', label: 'R&D — Salaries' },
    { k: 'rdContractors', label: 'R&D — Contractors' },
    { k: 'rdTools', label: 'R&D — Tools' },
    { k: 'gaSalaries', label: 'G&A — Salaries' },
    { k: 'gaLegal', label: 'G&A — Legal' },
    { k: 'gaInsurance', label: 'G&A — Insurance' },
    { k: 'gaOther', label: 'G&A — Other' },
    { k: 'depreciation', label: 'Depreciation & Amortization' },
    { k: 'interestExpense', label: 'Interest Expense' },
    { k: 'interestIncome', label: 'Interest Income' },
    { k: 'stockBasedComp', label: 'Stock-Based Compensation' },
  ]

  const [vals, setVals] = useState<Record<string, string>>({})

  const STRICT_NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

  function num(v: string): number | null {
    const trimmed = v.trim()
    if (!trimmed || !STRICT_NUM_RE.test(trimmed)) return null
    return Number(trimmed)
  }

  function handleSubmit() {
    setError('')
    const revenueVal = num(vals['subscriptionRevenue'] ?? vals['servicesRevenue'] ?? '')
    if (revenueVal === null) {
      const anyNumeric = fields.some(({ k }) => num(vals[k] ?? '') !== null)
      if (!anyNumeric) { setError('At least one numeric field is required.'); return }
    }
    startTransition(async () => {
      try {
        const extra = Object.fromEntries(fields.map(({ k }) => [k, num(vals[k] ?? '')])) as Omit<IncomeStatementData, 'companyId' | 'period'>
        const data: IncomeStatementData = { companyId, period, ...extra }
        await saveIncomeStatement(data)
        onClose()
      } catch (e) { setError('Failed to save.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Log Income Statement</Dialog.Title>
            <button aria-label="Close dialog" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-full">
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(({ k, label }) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">{label}</label>
                  <input type="number" value={vals[k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} placeholder="0" className="input w-full h-7 text-[12px]" />
                </div>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <button onClick={onClose} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save P&L'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function BalanceSheetForm({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const periods = getPeriodOptions(12)
  const [period, setPeriod] = useState(periods[0] ?? '')
  const [vals, setVals] = useState<Record<string, string>>({})

  const fields: Array<{ k: keyof BalanceSheetData; label: string }> = [
    { k: 'cash', label: 'Cash' }, { k: 'shortTermInvestments', label: 'Short-term Investments' },
    { k: 'accountsReceivable', label: 'Accounts Receivable' }, { k: 'prepaidExpenses', label: 'Prepaid Expenses' },
    { k: 'otherCurrentAssets', label: 'Other Current Assets' }, { k: 'ppe', label: 'PP&E (net)' },
    { k: 'capitalizedSoftware', label: 'Capitalized Software' }, { k: 'goodwill', label: 'Goodwill' },
    { k: 'accountsPayable', label: 'Accounts Payable' }, { k: 'accruedLiabilities', label: 'Accrued Liabilities' },
    { k: 'deferredRevenueCurrent', label: 'Deferred Revenue (current)' }, { k: 'shortTermDebt', label: 'Short-term Debt' },
    { k: 'longTermDebt', label: 'Long-term Debt' }, { k: 'deferredRevenueLongTerm', label: 'Deferred Revenue (LT)' },
    { k: 'commonStock', label: 'Common Stock' }, { k: 'additionalPaidInCapital', label: 'APIC' },
    { k: 'accumulatedDeficit', label: 'Accumulated Deficit' }, { k: 'retainedEarnings', label: 'Retained Earnings' },
  ]

  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const extra = Object.fromEntries(fields.map(({ k }) => [k, num(vals[k] ?? '')])) as Omit<BalanceSheetData, 'companyId' | 'period'>
        const data: BalanceSheetData = { companyId, period, ...extra }
        await saveBalanceSheet(data)
        onClose()
      } catch (e) { setError('Failed to save.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Log Balance Sheet</Dialog.Title>
            <button aria-label="Close dialog" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-full">
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(({ k, label }) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">{label}</label>
                  <input type="number" value={vals[k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} placeholder="0" className="input w-full h-7 text-[12px]" />
                </div>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <button onClick={onClose} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CashFlowForm({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const periods = getPeriodOptions(12)
  const [period, setPeriod] = useState(periods[0] ?? '')
  const [vals, setVals] = useState<Record<string, string>>({})

  const fields: Array<{ k: keyof CashFlowData; label: string }> = [
    { k: 'cfDepreciation', label: 'Depreciation Add-back' }, { k: 'cfStockBasedComp', label: 'SBC Add-back' },
    { k: 'cfArChange', label: 'AR Change' }, { k: 'cfDeferredRevenueChange', label: 'Deferred Rev Change' },
    { k: 'cfApChange', label: 'AP Change' }, { k: 'cfAccruedLiabilitiesChange', label: 'Accrued Liab Change' },
    { k: 'cfPrepaidChange', label: 'Prepaid Change' }, { k: 'cfCapex', label: 'Capital Expenditures' },
    { k: 'cfCapitalizedSoftware', label: 'Capitalized Software' }, { k: 'cfAcquisitions', label: 'Acquisitions' },
    { k: 'cfEquityProceeds', label: 'Equity Raised' }, { k: 'cfDebtProceeds', label: 'Debt Raised' },
    { k: 'cfDebtRepayment', label: 'Debt Repayment' }, { k: 'cfOptionExercises', label: 'Option Exercises' },
    { k: 'beginningCash', label: 'Beginning Cash' },
  ]

  function num(v: string): number | null { const n = parseFloat(v); return isNaN(n) ? null : n }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const extra = Object.fromEntries(fields.map(({ k }) => [k, num(vals[k] ?? '')])) as Omit<CashFlowData, 'companyId' | 'period'>
        const data: CashFlowData = { companyId, period, ...extra }
        await saveCashFlow(data)
        onClose()
      } catch (e) { setError('Failed to save.'); console.error(e) }
    })
  }

  return (
    <Dialog.Root open onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
            <Dialog.Title className="text-[14px] font-semibold">Log Cash Flow Statement</Dialog.Title>
            <button aria-label="Close dialog" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded"><X size={15} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-full">
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(({ k, label }) => (
                <div key={k} className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">{label}</label>
                  <input type="number" value={vals[k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} placeholder="0" className="input w-full h-7 text-[12px]" />
                </div>
              ))}
            </div>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
            <button onClick={onClose} className="h-8 px-4 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={pending} className={cn('h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium', pending ? 'opacity-50' : 'hover:bg-primary/90')}>
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
