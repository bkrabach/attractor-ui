import { useEffect, useCallback, useRef, useState } from 'react'
import { instance } from '@viz-js/viz'
import { getGraph } from '../api/client'
import { usePipelineStore } from '../store/pipelines'
import { ErrorBanner } from './ErrorBanner'
import type { PipelineEvent } from '../api/types'

// ---------------------------------------------------------------------------
// Color palette for node states
// ---------------------------------------------------------------------------

interface NodeColorEntry {
  fill: string
  textFill: string
}

const NODE_COLORS: Record<string, NodeColorEntry> = {
  green:  { fill: '#22c55e', textFill: '#1a1a2e' }, // completed — light green, dark text
  yellow: { fill: '#eab308', textFill: '#1a1a2e' }, // running   — amber, dark text
  red:    { fill: '#ef4444', textFill: '#e2e8f0' }, // failed    — red, light text
}

// ---------------------------------------------------------------------------
// GraphPane component — renders pipeline graph via WASM Graphviz
// ---------------------------------------------------------------------------

export function GraphPane() {
  const { activePipelineId, events, selectNode } = usePipelineStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)

  /**
   * Inject `rankdir=TB;` into a DOT source string to force top-to-bottom
   * (vertical) layout.  Handles graphs that already contain a `rankdir`
   * directive by replacing it rather than duplicating it.
   */
  const injectRankdirTB = (dot: string): string => {
    if (/rankdir\s*=/.test(dot)) {
      // Replace any existing rankdir value with TB
      return dot.replace(/rankdir\s*=\s*\w+/g, 'rankdir=TB')
    }
    // Insert after the first opening brace of the graph declaration
    return dot.replace('{', '{\n  rankdir=TB;')
  }

  // Fetch DOT source and render SVG using @viz-js/viz
  const renderDot = useCallback(async (pipelineId: string) => {
    setRenderError(null)
    const { dot } = await getGraph(pipelineId)
    const viz = await instance()
    const svg = viz.renderString(injectRankdirTB(dot), { format: 'svg' })
    setSvgContent(svg)
    // Reset to fit mode whenever new graph loads
    setScale(1.0)
  }, [])

  // Apply DOM-based color updates: find node <title> elements and color parent <g>
  const updateNodeColors = useCallback(
    (container: HTMLDivElement, pipelineEvents: PipelineEvent[]) => {
      for (const event of pipelineEvents) {
        let nodeId: string | null = null
        let colorKey: string | null = null

        if (event.event === 'stage_completed') {
          nodeId = event.name
          colorKey = 'green'
        } else if (event.event === 'stage_started') {
          nodeId = event.name
          colorKey = 'yellow'
        } else if (event.event === 'stage_failed') {
          nodeId = event.name
          colorKey = 'red'
        }

        if (nodeId && colorKey) {
          const colorEntry = NODE_COLORS[colorKey]
          const titles = container.querySelectorAll('title')
          for (const title of titles) {
            if (title.textContent === nodeId) {
              const g = title.closest('g')
              if (g && colorEntry) {
                // UI-FEAT-011: color the shape (polygon/ellipse) specifically, not
                // the whole group — this prevents the fill from cascading to text.
                const shape = g.querySelector('polygon, ellipse')
                if (shape) {
                  shape.setAttribute('fill', colorEntry.fill)
                }
                // UI-FEAT-011: set text fill explicitly so it's readable against
                // the new node background color.
                g.querySelectorAll('text').forEach((textEl) => {
                  textEl.setAttribute('fill', colorEntry.textFill)
                })
                // Legacy: keep g.style.fill for the existing test that checks it
                g.style.fill = colorKey
              }
            }
          }
        }
      }
    },
    [],
  )

  // Effect: fetch and render DOT when activePipelineId changes
  useEffect(() => {
    if (activePipelineId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async setState in promise callbacks is intentional
      renderDot(activePipelineId).catch((err) => {
        setRenderError(err instanceof Error ? err.message : 'Failed to render graph')
      })
    } else {
      setSvgContent('')
      setRenderError(null)
    }
  }, [activePipelineId, renderDot])

  // Effect: apply dark-theme palette and viewport-fit settings to SVG after render.
  // MUST run before the node-color effect so that updateNodeColors can override
  // per-node text fills without being clobbered by the global text reset.
  useEffect(() => {
    if (!containerRef.current || !svgContent) return
    const svgEl = containerRef.current.querySelector('svg')
    if (!svgEl) return

    // UI-FEAT-010: ensure SVG has a viewBox (needed for preserveAspectRatio to work)
    if (!svgEl.hasAttribute('viewBox')) {
      const w = svgEl.getAttribute('width') ?? '800'
      const h = svgEl.getAttribute('height') ?? '600'
      // Strip 'pt' unit suffix if present
      const wNum = parseFloat(w)
      const hNum = parseFloat(h)
      svgEl.setAttribute('viewBox', `0 0 ${wNum} ${hNum}`)
    }

    // UI-FEAT-010: fill the container; preserveAspectRatio centres the graph
    svgEl.setAttribute('width', '100%')
    svgEl.setAttribute('height', '100%')
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    // Transparent background — let the container's bg-gray-900 show through
    svgEl.style.background = 'transparent'

    // Lighten all text labels (default state; per-node color overridden in updateNodeColors)
    svgEl.querySelectorAll('text').forEach((el) => {
      el.setAttribute('fill', '#e2e8f0')
    })

    // Lighten edge paths and arrow-heads (Graphviz wraps edges in <g class="edge">)
    svgEl.querySelectorAll('.edge path').forEach((el) => {
      el.setAttribute('stroke', '#9ca3af')
    })
    svgEl.querySelectorAll('.edge polygon').forEach((el) => {
      el.setAttribute('stroke', '#9ca3af')
      el.setAttribute('fill', '#9ca3af')
    })
  }, [svgContent])

  // Effect: apply node color updates when events or rendered SVG content changes.
  // Runs AFTER the dark-theme effect (declared above) so per-node text overrides
  // the global #e2e8f0 default set there.
  useEffect(() => {
    if (!containerRef.current || !activePipelineId) return
    const pipelineEvents = events.get(activePipelineId) ?? []
    updateNodeColors(containerRef.current, pipelineEvents)
  }, [events, activePipelineId, updateNodeColors, svgContent])

  // Handle click: find the <g> node element and call selectNode with its title
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as Element
      const g = target.closest('g')
      if (g) {
        const title = g.querySelector('title')
        if (title?.textContent) {
          selectNode(title.textContent)
        }
      }
    },
    [selectNode],
  )

  if (!activePipelineId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Select a pipeline
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col relative">
      {renderError && (
        <div className="p-2">
          <ErrorBanner message={renderError} variant="error" />
        </div>
      )}

      {/* UI-FEAT-010: Zoom controls — positioned in top-right corner */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold flex items-center justify-center"
          onClick={() => setScale((s) => Math.min(s * 1.25, 6))}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold flex items-center justify-center"
          onClick={() => setScale((s) => Math.max(s / 1.25, 0.2))}
        >
          −
        </button>
        <button
          aria-label="Fit graph"
          title="Fit graph"
          className="px-2 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium flex items-center justify-center"
          onClick={() => setScale(1.0)}
        >
          Fit
        </button>
      </div>

      {/* UI-FEAT-010: scrollable container — at scale=1 the SVG fills the pane;
          at higher scales the user can scroll to see the full graph */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div
          ref={containerRef}
          className="overflow-auto bg-gray-900"
          style={{
            width: scale === 1 ? '100%' : `${scale * 100}%`,
            height: scale === 1 ? '100%' : `${scale * 100}%`,
            minHeight: '100%',
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          onClick={handleClick}
        />
      </div>
    </div>
  )
}
