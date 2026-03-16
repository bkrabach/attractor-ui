import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { ErrorBanner } from '../components/ErrorBanner'

describe('ErrorBanner', () => {
  it('renders error message', () => {
    render(<ErrorBanner message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders dismiss button when onDismiss provided', () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Error occurred" onDismiss={onDismiss} />)
    const button = screen.getByRole('button', { name: 'Dismiss' })
    expect(button).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Error occurred" onDismiss={onDismiss} />)
    const button = screen.getByRole('button', { name: 'Dismiss' })
    await user.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders warning variant with correct styles', () => {
    const { container } = render(<ErrorBanner message="Warning message" variant="warning" />)
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toContain('bg-yellow-900/40')
    expect(banner.className).toContain('border-yellow-700')
    expect(banner.className).toContain('text-yellow-300')
  })
})
