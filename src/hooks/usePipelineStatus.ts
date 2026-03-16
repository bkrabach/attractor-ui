import { useEffect, useRef } from 'react'
import { listPipelines } from '../api/client'
import { usePipelineStore } from '../store/pipelines'

/**
 * React hook that polls the pipeline list from the server.
 *
 * On mount and every intervalMs (default 5000ms):
 * - Calls listPipelines()
 * - Updates the Zustand store via setPipelines
 *
 * Silently ignores fetch errors (server may not be running).
 * Cleans up the interval timer on unmount.
 */
export function usePipelineStatus(intervalMs = 5000): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const { setPipelines } = usePipelineStore.getState()

    async function fetchPipelines(): Promise<void> {
      try {
        const pipelines = await listPipelines()
        setPipelines(pipelines)
      } catch {
        // Silently ignore fetch errors — server may not be running
      }
    }

    // Immediate initial fetch on mount
    void fetchPipelines()

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      void fetchPipelines()
    }, intervalMs)

    // Cleanup interval on unmount or before next effect run
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [intervalMs])
}
