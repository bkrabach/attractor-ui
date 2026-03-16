import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PipelineEvent } from '../api/types'

// Hoisted mutable mock state - must be defined before vi.mock()
const mockActivePipelineId = vi.hoisted(() => ({ current: null as string | null }))
const mockEvents = vi.hoisted(() => ({ current: new Map<string, PipelineEvent[]>() }))
const mockSelectNode = vi.hoisted(() => vi.fn())
const mockSseStatus = vi.hoisted(
  () => ({ current: 'connected' as 'connected' | 'reconnecting' | 'disconnected' }),
)

vi.mock('../store/pipelines', () => ({
  usePipelineStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      activePipelineId: mockActivePipelineId.current,
      events: mockEvents.current,
      selectNode: mockSelectNode,
      sseStatus: mockSseStatus.current,
    }
    if (selector) return selector(state)
    return state
  },
}))

import { EventStream } from '../components/EventStream'

describe('EventStream', () => {
  beforeEach(() => {
    mockActivePipelineId.current = null
    mockEvents.current = new Map()
    mockSelectNode.mockClear()
    mockSseStatus.current = 'connected'
  })

  it('shows empty state when no events', () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([['pipe-1', []]])

    render(<EventStream />)

    expect(screen.getByText('No events yet.')).toBeInTheDocument()
  })

  it('renders event entries from the store', () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          { event: 'stage_started', name: 'fetch-data', index: 0 } as PipelineEvent,
          { event: 'stage_completed', name: 'fetch-data', index: 0, duration: { __duration_ms: 100 } } as PipelineEvent,
        ],
      ],
    ])

    render(<EventStream />)

    expect(screen.getByText('stage_started')).toBeInTheDocument()
    expect(screen.getByText('stage_completed')).toBeInTheDocument()
    expect(screen.getAllByText('fetch-data')).toHaveLength(2)
  })

  it('applies green class for node_completed (stage_completed) events', () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'my-node',
            index: 0,
            duration: { __duration_ms: 50 },
          } as PipelineEvent,
        ],
      ],
    ])

    const { container } = render(<EventStream />)

    // The icon span for a completed event should have the green color class
    const greenIcon = container.querySelector('.text-green-400')
    expect(greenIcon).toBeInTheDocument()
  })

  it('applies red class for pipeline_failed events', () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'pipeline_failed',
            error: 'something went wrong',
            duration: { __duration_ms: 200 },
          } as PipelineEvent,
        ],
      ],
    ])

    const { container } = render(<EventStream />)

    // The icon span for a failed event should have the red color class
    const redIcon = container.querySelector('.text-red-400')
    expect(redIcon).toBeInTheDocument()
  })

  it('calls selectNode when an event row is clicked', async () => {
    const user = userEvent.setup()
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          { event: 'stage_started', name: 'process-data', index: 0 } as PipelineEvent,
        ],
      ],
    ])

    render(<EventStream />)

    const eventRow = screen.getByText('stage_started').closest('li')
    expect(eventRow).toBeInTheDocument()
    await user.click(eventRow!)

    expect(mockSelectNode).toHaveBeenCalledTimes(1)
    expect(mockSelectNode).toHaveBeenCalledWith('process-data')
  })

  it('shows warning banner when sseStatus is reconnecting', () => {
    mockSseStatus.current = 'reconnecting'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([['pipe-1', []]])

    render(<EventStream />)

    expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument()
  })

  it('shows error banner when sseStatus is disconnected and activePipelineId exists', () => {
    mockSseStatus.current = 'disconnected'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([['pipe-1', []]])

    render(<EventStream />)

    expect(
      screen.getByText('Disconnected from server. Events may be stale.'),
    ).toBeInTheDocument()
  })

  it('does not show disconnected error banner when no activePipelineId', () => {
    mockSseStatus.current = 'disconnected'
    mockActivePipelineId.current = null
    mockEvents.current = new Map()

    render(<EventStream />)

    expect(
      screen.queryByText('Disconnected from server. Events may be stale.'),
    ).not.toBeInTheDocument()
  })
})
