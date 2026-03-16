import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Sidebar } from '../components/Sidebar'

describe('Sidebar', () => {
  it('renders the Attractor header', () => {
    render(<Sidebar />)
    expect(screen.getByText('Attractor')).toBeInTheDocument()
  })

  it('renders the placeholder text when no pipelines exist', () => {
    render(<Sidebar />)
    expect(screen.getByText('No pipelines yet.')).toBeInTheDocument()
  })

  it('renders a New Pipeline button', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /\+ New Pipeline/i })).toBeInTheDocument()
  })

  it('has a dark theme with gray-900 background class', () => {
    const { container } = render(<Sidebar />)
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.className).toMatch(/bg-gray-900/)
  })

  it('has fixed width classes w-64 and min-w-48', () => {
    const { container } = render(<Sidebar />)
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.className).toMatch(/w-64/)
    expect(sidebar.className).toMatch(/min-w-48/)
  })
})
