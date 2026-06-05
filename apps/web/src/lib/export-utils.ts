// CSV export utilities — client-side, no dependencies

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = row[h]
          if (v == null) return ''
          const str = String(v)
          // quote if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ]
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadTemplate(headers: string[], filename: string) {
  downloadCsv([Object.fromEntries(headers.map((h) => [h, '']))], filename)
}

// ── Portfolio CSV export ─────────────────────────────────────

export function exportPortfolioCsv(companies: Array<{
  name: string; sector: string; stage: string; country?: string; foundedYear?: number | null;
  website?: string | null; healthStatus: string; healthScore: number;
  metrics: Array<{ mrr?: number | null; arr?: number | null; revenueGrowthMom?: number | null; burnRate?: number | null; runway?: number | null; headcount?: number | null; grossMargin?: number | null }>
}>) {
  const today = new Date().toISOString().split('T')[0]
  const rows = companies.map((c) => {
    const m = c.metrics[0]
    return {
      Name: c.name,
      Sector: c.sector,
      Stage: c.stage,
      Country: c.country ?? '',
      'Founded Year': c.foundedYear ?? '',
      Website: c.website ?? '',
      'Health Status': c.healthStatus,
      'Health Score': Math.round(c.healthScore),
      'MRR ($)': m?.mrr ?? '',
      'ARR ($)': m?.arr ?? '',
      'MoM Growth (%)': m?.revenueGrowthMom != null ? (m.revenueGrowthMom * 100).toFixed(1) : '',
      'Burn Rate ($)': m?.burnRate ?? '',
      'Runway (months)': m?.runway != null ? Math.floor(m.runway) : '',
      'Gross Margin (%)': m?.grossMargin ?? '',
      Headcount: m?.headcount ?? '',
    }
  })
  downloadCsv(rows, `signalos-portfolio-${today}.csv`)
}

// ── Metric history CSV ────────────────────────────────────────

export function exportMetricHistoryCsv(companyName: string, metrics: Array<{
  period: string; mrr?: number | null; arr?: number | null; revenueGrowthMom?: number | null;
  revenueGrowthYoy?: number | null; grossMargin?: number | null; nrr?: number | null;
  burnRate?: number | null; cashBalance?: number | null; runway?: number | null;
  headcount?: number | null; healthScore?: number | null; source?: string;
}>) {
  const today = new Date().toISOString().split('T')[0]
  const rows = metrics.map((m) => ({
    Period: m.period,
    'MRR ($)': m.mrr ?? '',
    'ARR ($)': m.arr ?? '',
    'MoM Growth (%)': m.revenueGrowthMom != null ? (m.revenueGrowthMom * 100).toFixed(1) : '',
    'YoY Growth (%)': m.revenueGrowthYoy != null ? (m.revenueGrowthYoy * 100).toFixed(1) : '',
    'Gross Margin (%)': m.grossMargin ?? '',
    'NRR (%)': m.nrr ?? '',
    'Burn Rate ($)': m.burnRate ?? '',
    'Cash Balance ($)': m.cashBalance ?? '',
    'Runway (months)': m.runway != null ? Math.floor(m.runway) : '',
    Headcount: m.headcount ?? '',
    'Health Score': m.healthScore != null ? Math.round(m.healthScore) : '',
    Source: m.source ?? '',
  }))
  const slug = companyName.toLowerCase().replace(/\s+/g, '-')
  downloadCsv(rows, `${slug}-metrics-${today}.csv`)
}

// ── Schedule of Investments CSV ───────────────────────────────

export function exportScheduleOfInvestmentsCsv(entries: Array<{
  companyName: string; companySector: string; companyStage: string;
  roundName: string; securityType: string; investmentDate: Date;
  amountInvested: number; fairValue: number; moic: number | null;
  grossIrr: number | null; ownershipPctFullyDiluted: number | null;
  valuationMethod: string;
}>) {
  const today = new Date().toISOString().split('T')[0]
  const rows = entries.map((e) => ({
    Company: e.companyName,
    Sector: e.companySector,
    Stage: e.companyStage,
    'Security / Round': e.roundName,
    'Security Type': e.securityType,
    'Investment Date': e.investmentDate.toISOString().split('T')[0],
    'Cost Basis ($)': e.amountInvested,
    'Fair Value ($)': e.fairValue,
    MOIC: e.moic != null ? e.moic.toFixed(2) : '',
    'Gross IRR (%)': e.grossIrr != null ? (e.grossIrr * 100).toFixed(1) : '',
    'Ownership % FD': e.ownershipPctFullyDiluted != null ? e.ownershipPctFullyDiluted.toFixed(2) : '',
    'Valuation Method': e.valuationMethod.replace('_', ' '),
  }))
  downloadCsv(rows, `schedule-of-investments-${today}.csv`)
}

// ── Company import template ───────────────────────────────────

export const COMPANY_IMPORT_HEADERS = [
  'name', 'sector', 'stage', 'country', 'website', 'foundedYear', 'description',
]

export const METRICS_IMPORT_HEADERS = [
  'companyName', 'period', 'mrr', 'arr', 'burnRate', 'cashBalance', 'runway',
  'grossMargin', 'nrr', 'headcount',
]

// ── Parse CSV ─────────────────────────────────────────────────

export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]!
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}
