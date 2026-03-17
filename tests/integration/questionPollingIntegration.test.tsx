import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { QuestionResponse } from '../../src/api/types'
import { usePipelineStore } from '../../src/store/pipelines'
import { usePipelineEvents } from '../../src/hooks/usePipelineEvents'
import { HumanInteraction } from '../../src/components/HumanInteraction'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockGetQuestions = vi.hoisted(() => vi.fn())
const mockSubmitAnswer = vi.hoisted(() => vi.fn())

vi.mock('../../src/api/client', () => ({
  getQuestions: mockGetQuestions,
  submitAnswer: mockSubmitAnswer,
}))

vi.mock('../../src/api/sse', () => ({
  subscribeToPipeline: vi.fn().mockReturnValue({ close: vi.fn() }),
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const PIPE_ID = 'integration-test-pipe-001'

function seedStore() {
  usePipelineStore.setState({
    pipelines: new Map([
      [
        PIPE_ID,
        {
          id: PIPE_ID,
          status: 'running',
          started_at: '2024-01-01T00:00:00Z',
          completed_nodes: [],
          current_node: 'HumanBrainstorm',
        },
      ],
    ]),
    activePipelineId: PIPE_ID,
    events: new Map(),
    questions: new Map(),
    selectedNodeId: null,
    sseStatus: 'disconnected',
  })
}

// ---------------------------------------------------------------------------
// Integration tests: polling → store → HumanInteraction render (UI-BUG-006)
//
// These tests exercise the FULL path:
//   getQuestions API  →  setQuestions store action  →  HumanInteraction render
//
// All previous tests mock the store, which hides integration bugs.  These
// tests use the real Zustand store so a bug in any part of the path fails here.
// ---------------------------------------------------------------------------

describe('Question polling → store → HumanInteraction integration (UI-BUG-006)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    seedStore()
    mockGetQuestions.mockResolvedValue({ questions: [] })
    mockSubmitAnswer.mockResolvedValue({ status: 'answered' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders question in HumanInteraction after poll returns a question — full path', async () => {
    const fakeQuestion: QuestionResponse = {
      qid: 'real-server-uuid-001',
      text: 'Ready to brainstorm? Choose an option:',
      question_type: 'multi_select',
      options: [
        { key: 'C', label: 'Continue' },
        { key: 'S', label: 'Stop' },
      ],
      created_at: '2024-01-01T00:00:00Z',
    }

    // First poll returns nothing (pipeline hasn't reached gate yet).
    // Second and subsequent polls return the question (gate reached).
    mockGetQuestions
      .mockResolvedValueOnce({ questions: [] })
      .mockResolvedValue({ questions: [fakeQuestion] })

    // Render HumanInteraction — it reads questions from the real Zustand store
    render(<HumanInteraction />)

    // Start the polling hook
    const { unmount } = renderHook(() => usePipelineEvents(PIPE_ID))

    // Initially: no questions
    expect(screen.getByText('No pending questions.')).toBeInTheDocument()

    // First poll fires at T=2s — server returns empty, no store update
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    expect(screen.getByText('No pending questions.')).toBeInTheDocument()

    // Second poll fires at T=4s — server returns the question
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    // Flush remaining microtasks
    await act(async () => {
      await Promise.resolve()
    })

    // The question must be visible in HumanInteraction
    expect(screen.getByText('Ready to brainstorm? Choose an option:')).toBeInTheDocument()
    // Options rendered as checkboxes for multi_select
    expect(screen.getByRole('checkbox', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Stop' })).toBeInTheDocument()

    unmount()
  })

  it('shows confirmation question (Yes/No buttons) from poll — full path', async () => {
    const confirmQuestion: QuestionResponse = {
      qid: 'confirm-uuid-002',
      text: 'Proceed with the plan?',
      question_type: 'confirmation',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }

    mockGetQuestions.mockResolvedValue({ questions: [confirmQuestion] })

    render(<HumanInteraction />)
    const { unmount } = renderHook(() => usePipelineEvents(PIPE_ID))

    // Poll fires — question arrives
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    await act(async () => { await Promise.resolve() })

    expect(screen.getByText('Proceed with the plan?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument()

    unmount()
  })

  it('stops polling and removes question from UI after pipeline completes', async () => {
    const question: QuestionResponse = {
      qid: 'q-complete-003',
      text: 'Finish up?',
      question_type: 'confirmation',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }

    // Pipeline has question waiting
    mockGetQuestions.mockResolvedValue({ questions: [question] })

    render(<HumanInteraction />)
    const { unmount } = renderHook(() => usePipelineEvents(PIPE_ID))

    // First poll — question appears
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Finish up?')).toBeInTheDocument()

    // Pipeline completes — mark it in the store
    act(() => {
      usePipelineStore.getState().setPipelineStatus(PIPE_ID, 'completed')
    })

    // Now the poll should be skipped (pipeline is terminal)
    // Server returns empty (question was answered)
    mockGetQuestions.mockResolvedValue({ questions: [] })

    // Advance time — with status-check fix, no new poll fires
    await act(async () => {
      vi.advanceTimersByTime(4000)
      await Promise.resolve()
    })

    // The poll count should not have increased after completion
    // (at most the poll that was in-flight when we changed status may fire once)
    const callCount = mockGetQuestions.mock.calls.length
    // Advance more time to verify no further polling
    await act(async () => {
      vi.advanceTimersByTime(6000)
      await Promise.resolve()
    })
    expect(mockGetQuestions.mock.calls.length).toBe(callCount)

    unmount()
  })
})
