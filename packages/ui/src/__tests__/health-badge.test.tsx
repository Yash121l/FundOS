import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthBadge } from '../components/health-badge'

describe('HealthBadge', () => {
  it('shows "Healthy" label for HEALTHY status', () => {
    render(<HealthBadge status="HEALTHY" />)
    expect(screen.getByText('Healthy')).toBeDefined()
  })

  it('shows "Watchlist" label for WATCHLIST status', () => {
    render(<HealthBadge status="WATCHLIST" />)
    expect(screen.getByText('Watchlist')).toBeDefined()
  })

  it('shows "At Risk" label for AT_RISK status', () => {
    render(<HealthBadge status="AT_RISK" />)
    expect(screen.getByText('At Risk')).toBeDefined()
  })

  it('renders a dot indicator by default', () => {
    const { container } = render(<HealthBadge status="HEALTHY" />)
    // The dot is a span with rounded-full class
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('hides dot when showDot=false', () => {
    const { container } = render(<HealthBadge status="HEALTHY" showDot={false} />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots.length).toBe(0)
  })

  it('applies emerald color for HEALTHY', () => {
    const { container } = render(<HealthBadge status="HEALTHY" />)
    expect(container.innerHTML).toContain('emerald')
  })

  it('applies red color for AT_RISK', () => {
    const { container } = render(<HealthBadge status="AT_RISK" />)
    expect(container.innerHTML).toContain('red')
  })

  it('applies amber color for WATCHLIST', () => {
    const { container } = render(<HealthBadge status="WATCHLIST" />)
    expect(container.innerHTML).toContain('amber')
  })
})
