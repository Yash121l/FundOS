import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../components/badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>SaaS</Badge>)
    expect(screen.getByText('SaaS')).toBeDefined()
  })

  it('renders with healthy variant', () => {
    const { container } = render(<Badge variant="healthy">Healthy</Badge>)
    expect(container.innerHTML).toContain('emerald')
  })

  it('renders with atRisk variant', () => {
    const { container } = render(<Badge variant="atRisk">At Risk</Badge>)
    expect(container.innerHTML).toContain('red')
  })

  it('renders with watchlist variant', () => {
    const { container } = render(<Badge variant="watchlist">Watchlist</Badge>)
    expect(container.innerHTML).toContain('amber')
  })
})
