import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PipelineEvent } from '../api/types'

// ---------------------------------------------------------------------------
// Hoisted mutable mock state — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockSelectedNodeId = vi.hoisted(() => ({ current: null as string | null }))
const mockSelectedInstanceIndex = vi.hoisted(() => ({ current: null as number | null }))
const mockSelectNodeWithInstance = vi.hoisted(() => vi.fn())
const mockActivePipelineId = vi.hoisted(() => ({ current: null as string | null }))
const mockEvents = vi.hoisted(() => ({ current: new Map<string, PipelineEvent[]>() }))
const mockGetNodeResponse = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ content: null }),
)

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../store/pipelines', () => ({
  usePipelineStore: () => ({
    selectedNodeId: mockSelectedNodeId.current,
    selectedInstanceIndex: mockSelectedInstanceIndex.current,
    selectNodeWithInstance: mockSelectNodeWithInstance,
    activePipelineId: mockActivePipelineId.current,
    events: mockEvents.current,
  }),
}))

vi.mock('../api/client', () => ({
  getNodeResponse: mockGetNodeResponse,
}))

// Import after mocks are set up
import { NodeDetails } from '../components/NodeDetails'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodeDetails', () => {
  beforeEach(() => {
    mockSelectedNodeId.current = null
    mockSelectedInstanceIndex.current = null
    mockSelectNodeWithInstance.mockClear()
    mockActivePipelineId.current = null
    mockEvents.current = new Map()
    mockGetNodeResponse.mockClear()
    mockGetNodeResponse.mockResolvedValue({ content: null })
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

  // ---------------------------------------------------------------------------
  // UI-FEAT-012: LLM response display
  // ---------------------------------------------------------------------------

  it('UI-FEAT-012: fetches node response when completed node is selected', async () => {
    // RED: current NodeDetails never calls getNodeResponse
    mockSelectedNodeId.current = 'ExploreIdea'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'ExploreIdea',
            index: 0,
            duration: { __duration_ms: 5000 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockGetNodeResponse.mockResolvedValue({ content: 'The LLM produced this analysis.' })

    render(<NodeDetails />)

    await waitFor(() => {
      expect(mockGetNodeResponse).toHaveBeenCalledWith('pipe-1', 'ExploreIdea')
    })
  })

  it('UI-FEAT-012: shows LLM response content when loaded', async () => {
    // RED: current NodeDetails does not display response.md content
    mockSelectedNodeId.current = 'ExploreIdea'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'ExploreIdea',
            index: 0,
            duration: { __duration_ms: 5000 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockGetNodeResponse.mockResolvedValue({ content: 'The LLM produced this analysis.' })

    render(<NodeDetails />)

    await waitFor(() => {
      expect(screen.getByText('The LLM produced this analysis.')).toBeInTheDocument()
    })
  })

  it('UI-FEAT-012: shows waiting message when response not yet available', async () => {
    mockSelectedNodeId.current = 'DraftPlan'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_started',
            name: 'DraftPlan',
            index: 1,
          } as PipelineEvent,
        ],
      ],
    ])
    mockGetNodeResponse.mockResolvedValue({ content: null })

    render(<NodeDetails />)

    await waitFor(() => {
      expect(mockGetNodeResponse).toHaveBeenCalledWith('pipe-1', 'DraftPlan')
    })

    expect(screen.getByText(/waiting for response/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // UI-FEAT-015: Response tab / Full History tab
  // ---------------------------------------------------------------------------

  it('UI-FEAT-015: shows Response and Full History tabs when content has a separator', async () => {
    mockSelectedNodeId.current = 'ExploreIdea'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'ExploreIdea',
            index: 0,
            duration: { __duration_ms: 5000 },
          } as PipelineEvent,
        ],
      ],
    ])
    const fullContent = '[tool_call] read_files\n[tool_result] ...\n---\nHere is my final analysis.'
    mockGetNodeResponse.mockResolvedValue({ content: fullContent })

    render(<NodeDetails />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /response/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /full history/i })).toBeInTheDocument()
    })
  })

  it('UI-FEAT-015: Response tab is active by default and shows extracted response', async () => {
    mockSelectedNodeId.current = 'ExploreIdea'
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'ExploreIdea',
            index: 0,
            duration: { __duration_ms: 5000 },
          } as PipelineEvent,
        ],
      ],
    ])
    const fullContent = '[tool_call] read_files\n[tool_result] ...\n---\nHere is my final analysis.'
    mockGetNodeResponse.mockResolvedValue({ content: fullContent })

    render(<NodeDetails />)

    await waitFor(() => {
      // Default tab shows the extracted last response, not the full content
      expect(screen.getByText('Here is my final analysis.')).toBeInTheDocument()
      expect(screen.queryByText('[tool_call] read_files')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Fix 4: Instance navigation shows event data + "latest response" notice
  // ---------------------------------------------------------------------------

  it('Fix 4: shows "Showing latest response" notice when viewing a non-latest instance', async () => {
    mockSelectedNodeId.current = 'my-node'
    mockSelectedInstanceIndex.current = 1 // first of two instances
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          { event: 'stage_started', name: 'my-node', index: 0 } as PipelineEvent,
          {
            event: 'stage_completed',
            name: 'my-node',
            index: 0,
            duration: { __duration_ms: 1000 },
          } as PipelineEvent,
          { event: 'stage_started', name: 'my-node', index: 1 } as PipelineEvent,
          {
            event: 'stage_completed',
            name: 'my-node',
            index: 1,
            duration: { __duration_ms: 2000 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockGetNodeResponse.mockResolvedValue({ content: 'The LLM output.' })

    render(<NodeDetails />)

    await waitFor(() => {
      expect(screen.getByText(/Showing latest response/i)).toBeInTheDocument()
    })
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
