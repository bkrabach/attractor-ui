import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

// ---------------------------------------------------------------------------
// Mock react-resizable-panels — jsdom lacks ResizeObserver
// ---------------------------------------------------------------------------

vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  Panel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel">{children}</div>
  ),
  Separator: () => <div data-testid="resize-handle" />,
}))

// ---------------------------------------------------------------------------
// Mock the 4 child components
// ---------------------------------------------------------------------------

vi.mock('../components/GraphPane', () => ({
  GraphPane: () => <div data-testid="graph-pane">GraphPane</div>,
}))

vi.mock('../components/EventStream', () => ({
  EventStream: () => <div data-testid="event-stream">EventStream</div>,
}))

vi.mock('../components/NodeDetails', () => ({
  NodeDetails: () => <div data-testid="node-details">NodeDetails</div>,
}))

vi.mock('../components/HumanInteraction', () => ({
  HumanInteraction: () => <div data-testid="human-interaction">HumanInteraction</div>,
}))

// Import after mocks are set up
import { Dashboard } from '../components/Dashboard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard', () => {
  it('renders all four pane components', () => {
    render(<Dashboard />)
    expect(screen.getByTestId('graph-pane')).toBeInTheDocument()
    expect(screen.getByTestId('event-stream')).toBeInTheDocument()
    expect(screen.getByTestId('node-details')).toBeInTheDocument()
    expect(screen.getByTestId('human-interaction')).toBeInTheDocument()
  })

  it('has at least 3 resize handles', () => {
    render(<Dashboard />)
    const handles = screen.getAllByTestId('resize-handle')
    expect(handles.length).toBeGreaterThanOrEqual(3)
  })
})
