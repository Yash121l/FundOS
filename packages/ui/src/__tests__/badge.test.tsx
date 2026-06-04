import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../components/badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>SaaS</Badge>)
    expect(screen.getByText('SaaS')).toBeDefined()
  })

  it('renders with healthy variant', () => {
    render(<Badge variant="healthy">Healthy</Badge>)
    const el = screen.getByText('Healthy')
    expect(el.className).toContain('emerald')
  })

  it('renders with atRisk variant', () => {
    render(<Badge variant="atRisk">At Risk</Badge>)
    const el = screen.getByText('At Risk')
    expect(el.className).toContain('red')
  })

  it('renders with watchlist variant', () => {
    render(<Badge variant="watchlist">Watchlist</Badge>)
    const el = screen.getByText('Watchlist')
    expect(el.className).toContain('amber')
  })
})
