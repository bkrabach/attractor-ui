import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockGetQuestions = vi.hoisted(() => vi.fn())
const mockSetQuestions = vi.hoisted(() => vi.fn())
const mockAddEvent = vi.hoisted(() => vi.fn())
const mockClearPipelineEvents = vi.hoisted(() => vi.fn())
const mockSetSseStatus = vi.hoisted(() => vi.fn())
const mockSubscribeToPipeline = vi.hoisted(() =>
  vi.fn().mockReturnValue({ close: vi.fn() }),
)

vi.mock('../api/client', () => ({
  getQuestions: mockGetQuestions,
}))

vi.mock('../api/sse', () => ({
  subscribeToPipeline: mockSubscribeToPipeline,
}))

vi.mock('../store/pipelines', () => ({
  usePipelineStore: {
    getState: () => ({
      addEvent: mockAddEvent,
      clearPipelineEvents: mockClearPipelineEvents,
      setSseStatus: mockSetSseStatus,
      setQuestions: mockSetQuestions,
    }),
  },
}))

import { usePipelineEvents } from '../hooks/usePipelineEvents'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePipelineEvents — question polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetQuestions.mockResolvedValue({ questions: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('polls getQuestions every 2 seconds while connected to a pipeline', async () => {
    renderHook(() => usePipelineEvents('pipe-1'))

    // Not called immediately on mount
    expect(mockGetQuestions).not.toHaveBeenCalled()

    // Advance 2 s → first poll fires
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockGetQuestions).toHaveBeenCalledTimes(1)
    expect(mockGetQuestions).toHaveBeenCalledWith('pipe-1')

    // Advance another 2 s → second poll fires
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockGetQuestions).toHaveBeenCalledTimes(2)
  })

  it('does not poll when pipelineId is null', async () => {
    renderHook(() => usePipelineEvents(null))

    await act(async () => {
      vi.advanceTimersByTime(10000)
    })

    expect(mockGetQuestions).not.toHaveBeenCalled()
  })

  it('calls setQuestions with the fetched questions', async () => {
    const fakeQuestions = [
      {
        qid: 'q-1',
        text: 'Continue?',
        question_type: 'confirmation' as const,
        options: [],
        created_at: '2024-01-01T00:00:00Z',
      },
    ]
    mockGetQuestions.mockResolvedValue({ questions: fakeQuestions })

    renderHook(() => usePipelineEvents('pipe-1'))

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    // Wait for the promise to resolve
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockSetQuestions).toHaveBeenCalledWith('pipe-1', fakeQuestions)
  })

  it('clears the poll interval when pipelineId becomes null', async () => {
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => usePipelineEvents(id),
      { initialProps: { id: 'pipe-1' as string | null } },
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockGetQuestions).toHaveBeenCalledTimes(1)

    // Switch to null
    rerender({ id: null })

    // Advance more time — no more calls
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(mockGetQuestions).toHaveBeenCalledTimes(1)
  })
})
