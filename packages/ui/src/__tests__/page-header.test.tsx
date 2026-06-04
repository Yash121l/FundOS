import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../components/page-header'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Portfolio" />)
    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeDefined()
  })

  it('renders description when provided', () => {
    render(<PageHeader title="Portfolio" description="Active companies" />)
    expect(screen.getByText('Active companies')).toBeDefined()
  })

  it('omits description when not provided', () => {
    const { container } = render(<PageHeader title="Portfolio" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders actions slot when provided', () => {
    render(<PageHeader title="Portfolio" actions={<button>New</button>} />)
    expect(screen.getByRole('button', { name: 'New' })).toBeDefined()
  })

  it('merges custom className into wrapper', () => {
    const { container } = render(<PageHeader title="Test" className="custom-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('custom-class')
  })

  it('spreads extra HTML attributes onto root div', () => {
    const { container } = render(<PageHeader title="Test" data-testid="page-header" />)
    expect((container.firstChild as HTMLElement).getAttribute('data-testid')).toBe('page-header')
  })
})
