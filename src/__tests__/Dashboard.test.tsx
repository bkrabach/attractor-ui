import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Dashboard } from '../components/Dashboard'

describe('Dashboard', () => {
  it('renders the Graph Pane', () => {
    render(<Dashboard />)
    expect(screen.getByText('Graph Pane')).toBeInTheDocument()
  })

  it('renders the Event Stream pane', () => {
    render(<Dashboard />)
    expect(screen.getByText('Event Stream')).toBeInTheDocument()
  })

  it('renders the Node Details pane', () => {
    render(<Dashboard />)
    expect(screen.getByText('Node Details')).toBeInTheDocument()
  })

  it('renders the Human Interaction pane', () => {
    render(<Dashboard />)
    expect(screen.getByText('Human Interaction')).toBeInTheDocument()
  })

  it('has a 2x2 grid layout with grid-cols-2 and grid-rows-2', () => {
    const { container } = render(<Dashboard />)
    const grid = container.firstChild as HTMLElement
    expect(grid.className).toMatch(/grid/)
    expect(grid.className).toMatch(/grid-cols-2/)
    expect(grid.className).toMatch(/grid-rows-2/)
  })

  it('has gap-px between panes', () => {
    const { container } = render(<Dashboard />)
    const grid = container.firstChild as HTMLElement
    expect(grid.className).toMatch(/gap-px/)
  })
})
