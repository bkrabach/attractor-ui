import { Group, Panel, Separator } from 'react-resizable-panels'
import { GraphPane } from './GraphPane'
import { EventStream } from './EventStream'
import { NodeDetails } from './NodeDetails'
import { HumanInteraction } from './HumanInteraction'
import { usePipelineStore } from '../store/pipelines'
import type { PipelineStatus } from '../api/types'

// ---------------------------------------------------------------------------
// localStorage helpers for pane persistence
// ---------------------------------------------------------------------------

type Layout = Record<string, number>

const STORAGE_KEY_VERTICAL = 'attractor-panels-vertical'
const STORAGE_KEY_TOP = 'attractor-panels-top'
const STORAGE_KEY_BOTTOM = 'attractor-panels-bottom'

function readLayout(key: string): Layout | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Layout
  } catch {
    // ignore parse errors
  }
  return undefined
}

function saveLayout(key: string, layout: Layout): void {
  try {
    localStorage.setItem(key, JSON.stringify(layout))
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Terminal status banner (UI-BUG-016)
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<PipelineStatus>(['cancelled', 'completed', 'failed'])

interface TerminalBannerProps {
  status: PipelineStatus
}

function TerminalBanner({ status }: TerminalBannerProps) {
  const colorClass =
    status === 'completed'
      ? 'bg-green-900/80 border-green-600 text-green-200'
      : status === 'failed'
        ? 'bg-red-900/80 border-red-600 text-red-200'
        : 'bg-gray-800/90 border-gray-600 text-gray-300' // cancelled

  return (
    <div
      className={`absolute inset-x-0 top-0 z-20 flex items-center justify-center py-2 border-b ${colorClass}`}
      aria-live="polite"
    >
      <span className="text-sm font-semibold capitalize">
        Pipeline {status}
      </span>
    </div>
  )
}

export function Dashboard() {
  const { activePipelineId, pipelines } = usePipelineStore()
  const verticalLayout = readLayout(STORAGE_KEY_VERTICAL)
  const topLayout = readLayout(STORAGE_KEY_TOP)
  const bottomLayout = readLayout(STORAGE_KEY_BOTTOM)

  const activePipeline = activePipelineId ? pipelines.get(activePipelineId) : undefined
  const terminalStatus = activePipeline && TERMINAL_STATUSES.has(activePipeline.status)
    ? activePipeline.status
    : null

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Terminal state banner (UI-BUG-016) */}
      {terminalStatus && <TerminalBanner status={terminalStatus} />}

      <Group
        orientation="vertical"
        className="flex-1"
        defaultLayout={verticalLayout}
        onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_VERTICAL, layout)}
      >
        {/* Top row: GraphPane (80%) | EventStream (20%) */}
        <Panel defaultSize={80} minSize={10}>
          <Group
            orientation="horizontal"
            defaultLayout={topLayout}
            onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_TOP, layout)}
          >
            <Panel defaultSize={80} minSize={10}>
              <div className="h-full bg-gray-950">
                <GraphPane />
              </div>
            </Panel>
            <Separator className="bg-gray-700 hover:bg-blue-500 w-px" />
            <Panel defaultSize={20} minSize={10}>
              <div className="h-full bg-gray-950">
                <EventStream />
              </div>
            </Panel>
          </Group>
        </Panel>

        {/* Vertical resize handle */}
        <Separator className="bg-gray-700 hover:bg-blue-500 h-px" />

        {/* Bottom row: NodeDetails (80%) | HumanInteraction (20%) */}
        <Panel defaultSize={20} minSize={5}>
          <Group
            orientation="horizontal"
            defaultLayout={bottomLayout}
            onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_BOTTOM, layout)}
          >
            <Panel defaultSize={80} minSize={10}>
              <div className="h-full bg-gray-950">
                <NodeDetails />
              </div>
            </Panel>
            <Separator className="bg-gray-700 hover:bg-blue-500 w-px" />
            <Panel defaultSize={20} minSize={10}>
              <div className="h-full bg-gray-950">
                <HumanInteraction />
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  )
}
