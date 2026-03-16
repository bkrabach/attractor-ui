import type { PipelineEvent } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_BACKOFF_MS = 1000
export const MAX_RECONNECT_ATTEMPTS = 3

// ---------------------------------------------------------------------------
// All 15 SSE event type names
// ---------------------------------------------------------------------------

const SSE_EVENT_TYPES = [
  'pipeline_started',
  'pipeline_completed',
  'pipeline_failed',
  'stage_started',
  'stage_completed',
  'stage_failed',
  'stage_retrying',
  'parallel_started',
  'parallel_branch_started',
  'parallel_branch_completed',
  'parallel_completed',
  'interview_started',
  'interview_completed',
  'interview_timeout',
  'checkpoint_saved',
] as const

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Callbacks passed to subscribeToPipeline */
export interface PipelineSubscription {
  onEvent: (event: PipelineEvent) => void
  onOpen?: () => void
  onError?: (error: Event) => void
  onFallback?: () => void
}

/** Returned by subscribeToPipeline — call close() to stop listening */
export interface SubscriptionHandle {
  close: () => void
}

// ---------------------------------------------------------------------------
// createEventSourceUrl
// ---------------------------------------------------------------------------

/**
 * Builds the SSE URL for a pipeline's event stream.
 * The optional `since` parameter enables resumption from a known event count.
 */
export function createEventSourceUrl(pipelineId: string, since = 0): string {
  return `/api/pipelines/${pipelineId}/events?since=${since}`
}

// ---------------------------------------------------------------------------
// parseSseEvent
// ---------------------------------------------------------------------------

/**
 * Parses a raw SSE data string into a PipelineEvent.
 * Returns null for empty data or invalid JSON.
 */
export function parseSseEvent(_eventType: string, data: string): PipelineEvent | null {
  if (data === '' || data.trim() === '') return null
  try {
    return JSON.parse(data) as PipelineEvent
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// subscribeToPipeline
// ---------------------------------------------------------------------------

/**
 * Opens an EventSource connection for the given pipeline, registers listeners
 * for all 15 named event types, and handles reconnection with exponential
 * backoff (up to MAX_RECONNECT_ATTEMPTS). The ?since= parameter is advanced
 * on each reconnect to avoid replaying already-seen events.
 */
export function subscribeToPipeline(
  pipelineId: string,
  callbacks: PipelineSubscription,
): SubscriptionHandle {
  let eventSource: EventSource | null = null
  let reconnectAttempts = 0
  let eventCount = 0
  let closed = false

  function connect(since: number): void {
    if (closed) return

    const url = createEventSourceUrl(pipelineId, since)
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      reconnectAttempts = 0
      callbacks.onOpen?.()
    }

    eventSource.onerror = (error: Event) => {
      callbacks.onError?.(error)
      eventSource?.close()
      eventSource = null

      if (closed) return

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        callbacks.onFallback?.()
        return
      }

      const backoff = BASE_BACKOFF_MS * Math.pow(2, reconnectAttempts)
      reconnectAttempts++
      setTimeout(() => connect(eventCount), backoff)
    }

    for (const eventType of SSE_EVENT_TYPES) {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        const event = parseSseEvent(eventType, (e as MessageEvent).data as string)
        if (event !== null) {
          eventCount++
          callbacks.onEvent(event)
        }
      })
    }
  }

  connect(0)

  return {
    close(): void {
      closed = true
      eventSource?.close()
      eventSource = null
    },
  }
}
