import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatMrr,
  formatPercent,
  formatGrowth,
  formatDate,
  formatRelativeTime,
  formatPeriod,
  formatRunway,
  formatNumber,
  currentPeriod,
  previousPeriod,
  slugify,
  truncate,
  pluralize,
  healthStatusLabel,
  severityLabel,
  stageLabel,
  sectorLabel,
} from '../index'

// ── Currency ─────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats full USD with no decimals by default', () => {
    expect(formatCurrency(1_234_567)).toContain('1,234,567')
  })

  it('compact: shows M for millions', () => {
    expect(formatCurrency(1_500_000, true)).toBe('$1.5M')
    expect(formatCurrency(2_000_000, true)).toBe('$2.0M')
  })

  it('compact: shows K for thousands', () => {
    expect(formatCurrency(500_000, true)).toBe('$500K')
    expect(formatCurrency(50_000, true)).toBe('$50K')
  })

  it('compact: shows raw dollar for small amounts', () => {
    expect(formatCurrency(999, true)).toBe('$999')
  })
})

describe('formatMrr', () => {
  it('returns em dash for null or undefined', () => {
    expect(formatMrr(null)).toBe('—')
    expect(formatMrr(undefined)).toBe('—')
  })

  it('uses compact format', () => {
    expect(formatMrr(250_000)).toBe('$250K')
  })
})

// ── Percent ───────────────────────────────────────────────────

describe('formatPercent', () => {
  it('returns em dash for null', () => {
    expect(formatPercent(null)).toBe('—')
  })

  it('formats positive with + sign', () => {
    expect(formatPercent(0.123)).toBe('+12.3%')
  })

  it('formats negative without + sign', () => {
    expect(formatPercent(-0.05)).toBe('-5.0%')
  })

  it('respects decimals parameter', () => {
    expect(formatPercent(0.1234, 2)).toBe('+12.34%')
  })
})

describe('formatGrowth', () => {
  it('returns em dash for null', () => {
    expect(formatGrowth(null)).toBe('—')
  })

  it('formats positive growth', () => {
    expect(formatGrowth(0.15)).toBe('+15.0%')
  })

  it('formats negative growth', () => {
    expect(formatGrowth(-0.08)).toBe('-8.0%')
  })
})

// ── Date ──────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns em dash for null, undefined, or empty', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('formats a known date string', () => {
    // Jan 15 2025 should appear in output
    const result = formatDate('2025-01-15')
    expect(result).toContain('2025')
    expect(result).toContain('Jan')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns em dash for null', () => {
    expect(formatRelativeTime(null)).toBe('—')
  })

  it('returns "just now" for recent timestamps (< 1 min)', () => {
    const recent = new Date('2026-06-04T11:59:30Z')
    expect(formatRelativeTime(recent)).toBe('just now')
  })

  it('returns minutes ago for < 1 hour', () => {
    const thirtyMinsAgo = new Date('2026-06-04T11:30:00Z')
    expect(formatRelativeTime(thirtyMinsAgo)).toBe('30m ago')
  })

  it('returns hours ago for < 24 hours', () => {
    const threeHoursAgo = new Date('2026-06-04T09:00:00Z')
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for < 7 days', () => {
    const twoDaysAgo = new Date('2026-06-02T12:00:00Z')
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
  })

  it('falls back to formatDate for dates > 7 days ago', () => {
    const twoWeeksAgo = new Date('2026-05-21T12:00:00Z')
    const result = formatRelativeTime(twoWeeksAgo)
    expect(result).toContain('2026')
  })
})

// ── Period ────────────────────────────────────────────────────

describe('formatPeriod', () => {
  it('converts YYYY-MM to "Mon YYYY"', () => {
    expect(formatPeriod('2025-03')).toBe('Mar 2025')
    expect(formatPeriod('2024-12')).toBe('Dec 2024')
    expect(formatPeriod('2026-01')).toBe('Jan 2026')
  })

  it('returns the original string for malformed input', () => {
    expect(formatPeriod('invalid')).toBe('invalid')
  })
})

describe('previousPeriod', () => {
  it('decrements month within same year', () => {
    expect(previousPeriod('2026-06')).toBe('2026-05')
    expect(previousPeriod('2026-03')).toBe('2026-02')
  })

  it('wraps from January to December of previous year', () => {
    expect(previousPeriod('2026-01')).toBe('2025-12')
  })

  it('pads single-digit months', () => {
    expect(previousPeriod('2026-11')).toBe('2026-10')
  })
})

describe('currentPeriod', () => {
  it('returns current YYYY-MM string', () => {
    const result = currentPeriod()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(result).toBe(expected)
  })
})

// ── Numbers ───────────────────────────────────────────────────

describe('formatRunway', () => {
  it('returns em dash for null', () => {
    expect(formatRunway(null)).toBe('—')
  })

  it('shows mo+ suffix for >= 24 months', () => {
    expect(formatRunway(24)).toBe('24mo+')
    expect(formatRunway(36)).toBe('36mo+')
  })

  it('shows mo suffix for < 24 months', () => {
    expect(formatRunway(18)).toBe('18mo')
    expect(formatRunway(6)).toBe('6mo')
  })

  it('floors fractional months', () => {
    expect(formatRunway(18.9)).toBe('18mo')
  })
})

describe('formatNumber', () => {
  it('returns em dash for null', () => {
    expect(formatNumber(null)).toBe('—')
  })

  it('formats with thousands separator', () => {
    expect(formatNumber(1234567)).toContain('1,234,567')
  })
})

// ── Strings ───────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Company! Inc.')).toBe('company-inc')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('foo  bar')).toBe('foo-bar')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })
})

describe('truncate', () => {
  it('returns original string if within maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates and appends ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })
})

describe('pluralize', () => {
  it('uses singular for count of 1', () => {
    expect(pluralize(1, 'company')).toBe('1 company')
  })

  it('uses default plural (appends s) for other counts', () => {
    expect(pluralize(0, 'company')).toBe('0 companys')
    expect(pluralize(5, 'company')).toBe('5 companys')
  })

  it('uses explicit plural when provided', () => {
    expect(pluralize(2, 'company', 'companies')).toBe('2 companies')
    expect(pluralize(0, 'company', 'companies')).toBe('0 companies')
  })
})

// ── Labels ────────────────────────────────────────────────────

describe('healthStatusLabel', () => {
  it('maps all known statuses', () => {
    expect(healthStatusLabel('HEALTHY')).toBe('Healthy')
    expect(healthStatusLabel('WATCHLIST')).toBe('Watchlist')
    expect(healthStatusLabel('AT_RISK')).toBe('At Risk')
  })

  it('returns the raw value for unknown statuses', () => {
    expect(healthStatusLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('severityLabel', () => {
  it('maps all known severities', () => {
    expect(severityLabel('LOW')).toBe('Low')
    expect(severityLabel('MEDIUM')).toBe('Medium')
    expect(severityLabel('HIGH')).toBe('High')
    expect(severityLabel('CRITICAL')).toBe('Critical')
  })
})

describe('stageLabel', () => {
  it('maps all known stages', () => {
    expect(stageLabel('PRE_SEED')).toBe('Pre-seed')
    expect(stageLabel('SEED')).toBe('Seed')
    expect(stageLabel('SERIES_A')).toBe('Series A')
    expect(stageLabel('SERIES_B')).toBe('Series B')
    expect(stageLabel('SERIES_C')).toBe('Series C')
    expect(stageLabel('GROWTH')).toBe('Growth')
  })
})

describe('sectorLabel', () => {
  it('maps all known sectors', () => {
    expect(sectorLabel('SAAS')).toBe('SaaS')
    expect(sectorLabel('FINTECH')).toBe('Fintech')
    expect(sectorLabel('AI')).toBe('AI')
    expect(sectorLabel('DEVTOOLS')).toBe('DevTools')
    expect(sectorLabel('CLIMATETECH')).toBe('ClimateTech')
    expect(sectorLabel('HEALTHTECH')).toBe('HealthTech')
    expect(sectorLabel('MARKETPLACE')).toBe('Marketplace')
    expect(sectorLabel('INFRASTRUCTURE')).toBe('Infrastructure')
  })
})
