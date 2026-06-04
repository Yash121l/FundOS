import { describe, it, expect } from 'vitest'
import { computeDelta } from '../index'

describe('computeDelta', () => {
  it('returns nulls when either value is null', () => {
    expect(computeDelta(null, 100)).toEqual({ current: null, previous: 100, delta: null, percentChange: null, direction: null })
    expect(computeDelta(100, null)).toEqual({ current: 100, previous: null, delta: null, percentChange: null, direction: null })
    expect(computeDelta(null, null)).toEqual({ current: null, previous: null, delta: null, percentChange: null, direction: null })
  })

  it('computes positive delta correctly', () => {
    const result = computeDelta(120_000, 100_000)
    expect(result.delta).toBe(20_000)
    expect(result.percentChange).toBeCloseTo(0.2)
    expect(result.direction).toBe('up')
  })

  it('computes negative delta correctly', () => {
    const result = computeDelta(80_000, 100_000)
    expect(result.delta).toBe(-20_000)
    expect(result.percentChange).toBeCloseTo(-0.2)
    expect(result.direction).toBe('down')
  })

  it('returns flat when change is within 0.1% of previous', () => {
    const result = computeDelta(100_050, 100_000)
    expect(result.direction).toBe('flat')
  })

  it('returns null percentChange when previous is 0', () => {
    const result = computeDelta(100, 0)
    expect(result.percentChange).toBeNull()
    expect(result.delta).toBe(100)
  })

  it('includes current and previous in the result', () => {
    const result = computeDelta(500, 400)
    expect(result.current).toBe(500)
    expect(result.previous).toBe(400)
  })
})
