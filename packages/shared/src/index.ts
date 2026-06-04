// ==================
// CURRENCY FORMATTING
// ==================

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatMrr(mrr: number | null | undefined): string {
  if (mrr == null) return '—'
  return formatCurrency(mrr, true)
}

// ==================
// PERCENTAGE FORMATTING
// ==================

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(decimals)}%`
}

export function formatGrowth(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

// ==================
// DATE FORMATTING
// ==================

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function formatPeriod(period: string): string {
  // "2025-03" → "Mar 2025"
  const [year, month] = period.split('-')
  if (!year || !month) return period
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
}

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

// ==================
// NUMBER FORMATTING
// ==================

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatRunway(months: number | null | undefined): string {
  if (months == null) return '—'
  if (months >= 24) return `${Math.floor(months)}mo+`
  return `${Math.floor(months)}mo`
}

// ==================
// STRING UTILITIES
// ==================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`
  return `${count} ${plural ?? `${singular}s`}`
}

// ==================
// HEALTH DISPLAY
// ==================

export function healthStatusLabel(status: string): string {
  switch (status) {
    case 'HEALTHY': return 'Healthy'
    case 'WATCHLIST': return 'Watchlist'
    case 'AT_RISK': return 'At Risk'
    default: return status
  }
}

export function severityLabel(severity: string): string {
  switch (severity) {
    case 'LOW': return 'Low'
    case 'MEDIUM': return 'Medium'
    case 'HIGH': return 'High'
    case 'CRITICAL': return 'Critical'
    default: return severity
  }
}

export function stageLabel(stage: string): string {
  switch (stage) {
    case 'PRE_SEED': return 'Pre-seed'
    case 'SEED': return 'Seed'
    case 'SERIES_A': return 'Series A'
    case 'SERIES_B': return 'Series B'
    case 'SERIES_C': return 'Series C'
    case 'GROWTH': return 'Growth'
    default: return stage
  }
}

export function sectorLabel(sector: string): string {
  switch (sector) {
    case 'SAAS': return 'SaaS'
    case 'FINTECH': return 'Fintech'
    case 'AI': return 'AI'
    case 'DEVTOOLS': return 'DevTools'
    case 'CLIMATETECH': return 'ClimateTech'
    case 'HEALTHTECH': return 'HealthTech'
    case 'MARKETPLACE': return 'Marketplace'
    case 'INFRASTRUCTURE': return 'Infrastructure'
    default: return sector
  }
}

// ==================
// PERIOD UTILITIES
// ==================

export function getPeriodOptions(count = 6): string[] {
  const options: string[] = []
  let p = currentPeriod()
  for (let i = 0; i < count; i++) {
    options.push(p)
    p = previousPeriod(p)
  }
  return options
}

export function suggestNextPeriod(filedPeriods: string[]): string {
  const options = getPeriodOptions(3)
  for (const option of options) {
    if (!filedPeriods.includes(option)) return option
  }
  return currentPeriod()
}
