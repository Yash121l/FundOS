import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../components/metric-card'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Total MRR" value="$1.2M" />)
    expect(screen.getByText('Total MRR')).toBeDefined()
    expect(screen.getByText('$1.2M')).toBeDefined()
  })

  it('shows delta when provided', () => {
    render(<MetricCard label="MRR" value="$1.2M" delta="+12%" deltaDirection="up" />)
    expect(screen.getByText(/12%/)).toBeDefined()
  })

  it('shows sub text when provided', () => {
    render(<MetricCard label="Burn" value="$80K" sub="per month" />)
    expect(screen.getByText('per month')).toBeDefined()
  })

  it('does not render delta row when neither delta nor sub is provided', () => {
    const { container } = render(<MetricCard label="MRR" value="$1M" />)
    expect(container.querySelector('.mt-0\\.5')).toBeNull()
  })

  it('applies up arrow for up direction', () => {
    const { container } = render(<MetricCard label="x" value="y" delta="+5%" deltaDirection="up" />)
    expect(container.innerHTML).toContain('↑')
  })

  it('applies down arrow for down direction', () => {
    const { container } = render(<MetricCard label="x" value="y" delta="-5%" deltaDirection="down" />)
    expect(container.innerHTML).toContain('↓')
  })

  it('applies flat arrow for flat direction', () => {
    const { container } = render(<MetricCard label="x" value="y" delta="0%" deltaDirection="flat" />)
    expect(container.innerHTML).toContain('→')
  })
})
