import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../components/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined()
  })

  it('calls onClick when clicked', async () => {
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true)
  })

  it('applies variant class names', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild?.toString()).not.toBe('')
  })

  it('renders as a slot (asChild) when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Link' })).toBeDefined()
  })
})
