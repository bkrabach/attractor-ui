import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the Sidebar', () => {
    render(<App />)
    expect(screen.getByText('Attractor')).toBeInTheDocument()
  })

  it('renders the Dashboard with all four panes', () => {
    render(<App />)
    expect(screen.getByText('Graph Pane')).toBeInTheDocument()
    expect(screen.getByText('Event Stream')).toBeInTheDocument()
    expect(screen.getByText('Node Details')).toBeInTheDocument()
    expect(screen.getByText('Human Interaction')).toBeInTheDocument()
  })

  it('has a flex h-screen root layout', () => {
    const { container } = render(<App />)
    const root = container.firstChild as HTMLElement
    expect(root.className).toMatch(/flex/)
    expect(root.className).toMatch(/h-screen/)
  })
})
