import type { PipelineEvent } from '../api/types'
import { usePipelineStore } from '../store/pipelines'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NodeStatus = 'completed' | 'running' | 'failed' | 'pending'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(events: PipelineEvent[], nodeName: string): NodeStatus {
  const nodeEvents = events.filter(
    (e) => 'name' in e && (e as { name: string }).name === nodeName,
  )

  if (nodeEvents.some((e) => e.event === 'stage_completed')) return 'completed'
  if (nodeEvents.some((e) => e.event === 'stage_failed')) return 'failed'
  if (nodeEvents.some((e) => e.event === 'stage_started')) return 'running'
  return 'pending'
}

function getDuration(events: PipelineEvent[], nodeName: string): number | null {
  const completedEvent = events.find(
    (e) => e.event === 'stage_completed' && 'name' in e && (e as { name: string }).name === nodeName,
  )
  if (completedEvent && completedEvent.event === 'stage_completed') {
    return completedEvent.duration.__duration_ms
  }
  return null
}

function getErrorMessage(events: PipelineEvent[], nodeName: string): string | null {
  const failedEvent = events.find(
    (e) => e.event === 'stage_failed' && 'name' in e && (e as { name: string }).name === nodeName,
  )
  if (failedEvent && failedEvent.event === 'stage_failed') {
    return failedEvent.error
  }
  return null
}

const STATUS_BADGE_CLASSES: Record<NodeStatus, string> = {
  completed: 'bg-green-500',
  running: 'bg-yellow-500',
  failed: 'bg-red-500',
  pending: 'bg-gray-500',
}

// ---------------------------------------------------------------------------
// NodeDetails component
// ---------------------------------------------------------------------------

export function NodeDetails() {
  const { selectedNodeId, activePipelineId, events } = usePipelineStore()

  if (!selectedNodeId) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Click a node to see details.
      </div>
    )
  }

  const pipelineEvents: PipelineEvent[] = activePipelineId
    ? (events.get(activePipelineId) ?? [])
    : []

  const status = deriveStatus(pipelineEvents, selectedNodeId)
  const durationMs = getDuration(pipelineEvents, selectedNodeId)
  const errorMessage = getErrorMessage(pipelineEvents, selectedNodeId)

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-200 mb-3">{selectedNodeId}</h2>

      <div className="mb-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs text-white ${STATUS_BADGE_CLASSES[status]}`}
        >
          {status}
        </span>
      </div>

      {durationMs !== null && (
        <div className="text-sm text-gray-400 mb-2">
          Duration: {(durationMs / 1000).toFixed(2)}s
        </div>
      )}

      {errorMessage && (
        <div className="text-sm text-red-400 mb-2">{errorMessage}</div>
      )}
    </div>
  )
}
