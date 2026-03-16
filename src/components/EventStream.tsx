import { useRef, useEffect, useState } from 'react'
import type { PipelineEvent } from '../api/types'
import { usePipelineStore } from '../store/pipelines'
import { ErrorBanner } from './ErrorBanner'

// ---------------------------------------------------------------------------
// Color coding helpers
// ---------------------------------------------------------------------------

interface EventStyle {
  icon: string
  colorClass: string
}

function getEventStyle(event: PipelineEvent): EventStyle {
  const type = event.event
  if (type.includes('completed')) {
    return { icon: '✓', colorClass: 'text-green-400' }
  }
  if (type.includes('started')) {
    return { icon: '⟳', colorClass: 'text-yellow-400' }
  }
  if (type.includes('failed')) {
    return { icon: '✗', colorClass: 'text-red-400' }
  }
  return { icon: 'ℹ', colorClass: 'text-blue-400' }
}

function getNodeName(event: PipelineEvent): string | null {
  if ('name' in event && typeof event.name === 'string') return event.name
  if ('branch' in event && typeof event.branch === 'string') return event.branch
  if ('node_id' in event && typeof event.node_id === 'string') return event.node_id
  return null
}

// ---------------------------------------------------------------------------
// EventStream component
// ---------------------------------------------------------------------------

export function EventStream() {
  const { activePipelineId, events, selectNode, sseStatus } = usePipelineStore()
  const [pinned, setPinned] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pipelineEvents: PipelineEvent[] = activePipelineId
    ? (events.get(activePipelineId) ?? [])
    : []

  // Auto-scroll to bottom when new events arrive, if pinned
  useEffect(() => {
    if (pinned && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [pipelineEvents.length, pinned])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
    setPinned(isAtBottom)
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Reconnection banners */}
      {sseStatus === 'reconnecting' && (
        <ErrorBanner message="Connection lost. Reconnecting..." variant="warning" />
      )}
      {sseStatus === 'disconnected' && activePipelineId && (
        <ErrorBanner message="Disconnected from server. Events may be stale." variant="error" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">Events</span>
          <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">
            {pipelineEvents.length}
          </span>
        </div>
        <button
          onClick={() => setPinned(!pinned)}
          className={`text-xs ${pinned ? 'text-blue-400' : 'text-gray-500'}`}
          aria-label={pinned ? 'Unpin from bottom' : 'Pin to bottom'}
        >
          ⬇ {pinned ? 'pinned' : 'unpinned'}
        </button>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {pipelineEvents.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No events yet.</div>
        ) : (
          <ul>
            {pipelineEvents.map((event, i) => {
              const { icon, colorClass } = getEventStyle(event)
              const nodeName = getNodeName(event)
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-900 cursor-pointer text-sm"
                  onClick={() => selectNode(nodeName)}
                >
                  <span className={colorClass}>{icon}</span>
                  <span className="text-gray-300">{event.event}</span>
                  {nodeName && (
                    <span className="text-gray-500 truncate">{nodeName}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
