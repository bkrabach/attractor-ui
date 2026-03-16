import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PipelineEvent } from '../api/types'

// ---------------------------------------------------------------------------
// Hoisted mutable mock state — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockSelectedNodeId = vi.hoisted(() => ({ current: null as string | null }))
const mockActivePipelineId = vi.hoisted(() => ({ current: null as string | null }))
const mockEvents = vi.hoisted(() => ({ current: new Map<string, PipelineEvent[]>() }))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../store/pipelines', () => ({
  usePipelineStore: () => ({
    selectedNodeId: mockSelectedNodeId.current,
    activePipelineId: mockActivePipelineId.current,
    events: mockEvents.current,
  }),
}))

// Import after mocks are set up
import { NodeDetails } from '../components/NodeDetails'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodeDetails', () => {
  beforeEach(() => {
    mockSelectedNodeId.current = null
    mockActivePipelineId.current = null
    mockEvents.current = new Map()
  })

  it('shows placeholder when no node selected', () => {
    render(<NodeDetails />)
    expect(screen.getByText('Click a node to see details.')).toBeInTheDocument()
  })

  it('shows node name when selected', () => {
    mockSelectedNodeId.current = 'my-node'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([['pipe-1', []]])

    render(<NodeDetails />)

    expect(screen.getByText('my-node')).toBeInTheDocument()
  })

  it('shows completed status with green badge', () => {
    mockSelectedNodeId.current = 'my-node'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'my-node',
            index: 0,
            duration: { __duration_ms: 2500 },
          } as PipelineEvent,
        ],
      ],
    ])

    const { container } = render(<NodeDetails />)

    expect(screen.getByText('completed')).toBeInTheDocument()
    const badge = container.querySelector('.bg-green-500')
    expect(badge).toBeInTheDocument()
  })

  it('shows error message for failed nodes', () => {
    mockSelectedNodeId.current = 'my-node'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_failed',
            name: 'my-node',
            index: 0,
            error: 'Something went wrong',
            will_retry: false,
          } as PipelineEvent,
        ],
      ],
    ])

    render(<NodeDetails />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
