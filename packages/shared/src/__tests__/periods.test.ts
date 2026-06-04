import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPeriodOptions, suggestNextPeriod } from '../index'

describe('getPeriodOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current period as the first option', () => {
    const options = getPeriodOptions()
    expect(options[0]).toBe('2026-06')
  })

  it('returns periods in descending order (newest first)', () => {
    const options = getPeriodOptions(3)
    expect(options).toEqual(['2026-06', '2026-05', '2026-04'])
  })

  it('defaults to 6 periods', () => {
    expect(getPeriodOptions()).toHaveLength(6)
  })

  it('respects a custom count', () => {
    expect(getPeriodOptions(2)).toHaveLength(2)
    expect(getPeriodOptions(12)).toHaveLength(12)
  })

  it('wraps correctly across year boundary', () => {
    vi.setSystemTime(new Date('2026-02-01T12:00:00Z'))
    const options = getPeriodOptions(4)
    expect(options).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })
})

describe('suggestNextPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current period when nothing has been filed', () => {
    expect(suggestNextPeriod([])).toBe('2026-06')
  })

  it('returns current period when only older periods are filed', () => {
    expect(suggestNextPeriod(['2026-04', '2026-03'])).toBe('2026-06')
  })

  it('returns previous period when current is already filed', () => {
    expect(suggestNextPeriod(['2026-06'])).toBe('2026-05')
  })

  it('skips filed periods to find the next unfiled one', () => {
    expect(suggestNextPeriod(['2026-06', '2026-05'])).toBe('2026-04')
  })

  it('falls back to current period when all recent periods are filed', () => {
    expect(suggestNextPeriod(['2026-06', '2026-05', '2026-04'])).toBe('2026-06')
  })
})
