import { describe, it, expect } from 'vitest'
import { projectRunway } from '../index'

describe('projectRunway', () => {
  it('returns cash / burn for normal inputs', () => {
    expect(projectRunway(1_200_000, 100_000)).toBe(12)
  })

  it('returns 999 when burnRate is 0 (no burn)', () => {
    expect(projectRunway(1_000_000, 0)).toBe(999)
  })

  it('returns 999 when burnRate is negative (profitable)', () => {
    expect(projectRunway(1_000_000, -50_000)).toBe(999)
  })

  it('handles fractional months', () => {
    expect(projectRunway(500_000, 300_000)).toBeCloseTo(1.667, 2)
  })

  it('returns 0 runway when cash is 0', () => {
    expect(projectRunway(0, 100_000)).toBe(0)
  })
})
