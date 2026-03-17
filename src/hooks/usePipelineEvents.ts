import { useEffect, useRef } from 'react'
import { subscribeToPipeline } from '../api/sse'
import type { SubscriptionHandle } from '../api/sse'
import { getQuestions } from '../api/client'
import { usePipelineStore } from '../store/pipelines'

/** How often (ms) to poll the questions endpoint while an SSE session is active. */
const QUESTION_POLL_INTERVAL_MS = 2000

/**
 * React hook that subscribes to a pipeline's SSE event stream.
 *
 * When pipelineId changes:
 * - Closes the existing SSE connection
 * - Clears events for the old pipeline
 * - Opens a new SSE connection with ?since=0
 * - Dispatches each event to the Zustand store via addEvent
 * - Reports connection lifecycle to the store via setSseStatus
 * - On interview_started, fetches real question data from the API so
 *   the HumanInteraction pane shows the correct qid, type, and options
 * - Polls GET /questions every 2 s as a reliable fallback, because the
 *   server does not currently emit interview_started SSE events
 *
 * Cleans up the subscription on unmount.
 */
export function usePipelineEvents(pipelineId: string | null): void {
  const subscriptionRef = useRef<SubscriptionHandle | null>(null)
  const prevPipelineIdRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const { addEvent, clearPipelineEvents, setSseStatus, setQuestions } =
      usePipelineStore.getState()

    // Close existing connection and clear events for the previous pipeline
    if (subscriptionRef.current !== null) {
      subscriptionRef.current.close()
      subscriptionRef.current = null
    }
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (prevPipelineIdRef.current !== null) {
      clearPipelineEvents(prevPipelineIdRef.current)
    }

    prevPipelineIdRef.current = pipelineId

    // Open new SSE connection if pipelineId is provided
    if (pipelineId !== null) {
      subscriptionRef.current = subscribeToPipeline(pipelineId, {
        onEvent: (event) => {
          addEvent(pipelineId, event)

          // When a human-in-the-loop interview starts, the SSE event only
          // carries the question text and stage name.  The full question
          // (real UUID qid, correct question_type, options) lives on the
          // server.  Fetch it immediately so HumanInteraction can render the
          // right UI and submit answers with the correct qid.
          if (event.event === 'interview_started') {
            getQuestions(pipelineId)
              .then(({ questions }) => {
                setQuestions(pipelineId, questions)
              })
              .catch(() => {
                // Best-effort: if the fetch fails the synthetic placeholder
                // added by addEvent remains visible as a fallback.
              })
          }
        },
        onOpen: () => {
          setSseStatus('connected')
        },
        onError: () => {
          setSseStatus('reconnecting')
        },
        onFallback: () => {
          setSseStatus('disconnected')
        },
      })

      // Poll for pending questions periodically.
      //
      // The server's pipeline engine does not currently emit
      // PipelineEvent::InterviewStarted, so the interview_started SSE handler
      // above is dead code for now.  Polling every 2 s is the reliable path
      // that ensures questions appear in the UI as soon as they are registered
      // on the server.
      pollIntervalRef.current = setInterval(() => {
        const { setQuestions: setQ } = usePipelineStore.getState()
        getQuestions(pipelineId)
          .then(({ questions }) => {
            setQ(pipelineId, questions)
          })
          .catch(() => {
            // Best-effort: network blip or pipeline gone — silently skip.
          })
      }, QUESTION_POLL_INTERVAL_MS)
    }

    // Cleanup on unmount or before next effect run
    return () => {
      if (subscriptionRef.current !== null) {
        subscriptionRef.current.close()
        subscriptionRef.current = null
      }
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [pipelineId])
}
