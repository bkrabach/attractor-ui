import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Sidebar and Dashboard directly
// ---------------------------------------------------------------------------

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock('../components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}))

// Import after mocks are set up
import App from '../App'

describe('App', () => {
  it('renders the Sidebar', () => {
    render(<App />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders the Dashboard', () => {
    render(<App />)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('has a flex h-screen bg-gray-950 root layout', () => {
    const { container } = render(<App />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/flex/)
    expect(root.className).toMatch(/h-screen/)
    expect(root.className).toMatch(/bg-gray-950/)
  })
})
