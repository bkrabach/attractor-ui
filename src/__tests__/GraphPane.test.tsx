import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PipelineEvent } from '../api/types'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockRenderString = vi.hoisted(() =>
  vi.fn().mockReturnValue('<svg><g id="node1"><title>nodeA</title></g></svg>'),
)

const mockGetGraph = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ dot: 'digraph { a -> b }', format: 'dot' }),
)

const mockActivePipelineId = vi.hoisted(() => ({ current: null as string | null }))
const mockEvents = vi.hoisted(() => ({ current: new Map<string, PipelineEvent[]>() }))
const mockSelectNode = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@viz-js/viz', () => ({
  instance: vi.fn().mockResolvedValue({
    renderString: mockRenderString,
  }),
}))

vi.mock('../api/client', () => ({
  getGraph: mockGetGraph,
}))

vi.mock('../store/pipelines', () => ({
  usePipelineStore: () => ({
    activePipelineId: mockActivePipelineId.current,
    events: mockEvents.current,
    selectNode: mockSelectNode,
  }),
}))

// Import after mocks are set up
import { GraphPane } from '../components/GraphPane'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GraphPane', () => {
  beforeEach(() => {
    mockActivePipelineId.current = null
    mockEvents.current = new Map()
    mockSelectNode.mockClear()
    mockGetGraph.mockClear()
    mockRenderString.mockClear()
    mockRenderString.mockReturnValue('<svg><g id="node1"><title>nodeA</title></g></svg>')
  })

  it("shows 'Select a pipeline' when no active pipeline", () => {
    render(<GraphPane />)
    expect(screen.getByText('Select a pipeline')).toBeInTheDocument()
  })

  it('calls getGraph and renders SVG when activePipelineId is set', async () => {
    mockActivePipelineId.current = 'pipe-1'

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      expect(mockGetGraph).toHaveBeenCalledWith('pipe-1')
    })

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('calls renderString with { format: "svg" } to produce SVG output', async () => {
    mockActivePipelineId.current = 'pipe-1'

    render(<GraphPane />)

    await waitFor(() => {
      // The DOT string passed to renderString may be modified (e.g. rankdir
      // injection) so only verify the format option, not the exact DOT source.
      expect(mockRenderString).toHaveBeenCalledWith(
        expect.any(String),
        { format: 'svg' },
      )
    })
  })

  it('injects rankdir=TB into the DOT source for vertical layout (UI-FEAT-004)', async () => {
    mockActivePipelineId.current = 'pipe-1'

    render(<GraphPane />)

    await waitFor(() => {
      const dotArg = mockRenderString.mock.calls[0]?.[0] as string
      expect(dotArg).toContain('rankdir=TB')
    })
  })

  it('graph container has dark background class (UI-FEAT-005)', async () => {
    mockActivePipelineId.current = 'pipe-1'

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    // The scrollable graph container should have a dark bg
    const graphContainer = container.querySelector('.overflow-auto')
    expect(graphContainer).toHaveClass('bg-gray-900')
  })

  it('applies green fill to completed nodes', async () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'nodeA',
            index: 0,
            duration: { __duration_ms: 100 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockRenderString.mockReturnValue(
      '<svg><g id="node1"><title>nodeA</title></g></svg>',
    )

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      const g = container.querySelector('g')
      expect(g?.style.fill).toBe('green')
    })
  })

  it('shows error banner when renderDot fails', async () => {
    mockActivePipelineId.current = 'pipe-fail'
    mockGetGraph.mockRejectedValueOnce(new Error('API unreachable'))

    render(<GraphPane />)

    await waitFor(() => {
      expect(screen.getByText('API unreachable')).toBeInTheDocument()
    })
  })

  it('sets preserveAspectRatio on SVG for viewport fit (UI-FEAT-010)', async () => {
    mockActivePipelineId.current = 'pipe-1'
    mockRenderString.mockReturnValue(
      '<svg width="800pt" height="400pt" viewBox="0 0 800 400"><g id="node1"><title>nodeA</title></g></svg>',
    )

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      const svgEl = container.querySelector('svg')
      expect(svgEl).toBeInTheDocument()
      expect(svgEl?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
    })
  })

  it('renders zoom controls (UI-FEAT-010)', async () => {
    mockActivePipelineId.current = 'pipe-1'

    render(<GraphPane />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fit/i })).toBeInTheDocument()
    })
  })

  it('completed node polygon has green fill, not the whole group (UI-FEAT-011)', async () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'nodeA',
            index: 0,
            duration: { __duration_ms: 100 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockRenderString.mockReturnValue(
      '<svg><g id="node1"><title>nodeA</title><polygon fill="#ffffff" stroke="black" points="100,100 200,100 200,150 100,150"/><text>nodeA</text></g></svg>',
    )

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      const polygon = container.querySelector('g polygon')
      // Polygon should have a colored fill (not white)
      expect(polygon?.getAttribute('fill')).not.toBe('#ffffff')
      expect(polygon?.getAttribute('fill')).toBeTruthy()
    })
  })

  it('completed node text has dark fill for readability on green background (UI-FEAT-011)', async () => {
    mockActivePipelineId.current = 'pipe-1'
    mockEvents.current = new Map([
      [
        'pipe-1',
        [
          {
            event: 'stage_completed',
            name: 'nodeA',
            index: 0,
            duration: { __duration_ms: 100 },
          } as PipelineEvent,
        ],
      ],
    ])
    mockRenderString.mockReturnValue(
      '<svg><g id="node1"><title>nodeA</title><polygon fill="#ffffff" stroke="black" points="100,100 200,100 200,150 100,150"/><text fill="#e2e8f0">nodeA</text></g></svg>',
    )

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      const text = container.querySelector('g text')
      // Text should have dark fill (not white/light) on green completed node
      const fill = text?.getAttribute('fill')
      expect(fill).toBe('#1a1a2e')
    })
  })

  it('calls selectNode when a node g element is clicked', async () => {
    const user = userEvent.setup()
    mockActivePipelineId.current = 'pipe-1'
    mockRenderString.mockReturnValue(
      '<svg><g id="node1"><title>nodeA</title></g></svg>',
    )

    const { container } = render(<GraphPane />)

    await waitFor(() => {
      expect(container.querySelector('g')).toBeInTheDocument()
    })

    await user.click(container.querySelector('g')!)

    expect(mockSelectNode).toHaveBeenCalledWith('nodeA')
  })
})
