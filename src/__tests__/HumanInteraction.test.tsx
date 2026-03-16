import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QuestionResponse } from '../api/types'

// ---------------------------------------------------------------------------
// Hoisted mutable mock state — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockActivePipelineId = vi.hoisted(() => ({ current: null as string | null }))
const mockQuestions = vi.hoisted(() => ({ current: new Map<string, QuestionResponse[]>() }))
const mockRemoveQuestion = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../store/pipelines', () => ({
  usePipelineStore: () => ({
    activePipelineId: mockActivePipelineId.current,
    questions: mockQuestions.current,
    removeQuestion: mockRemoveQuestion,
  }),
}))

const mockSubmitAnswer = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  submitAnswer: mockSubmitAnswer,
}))

// Import after mocks are set up
import { HumanInteraction } from '../components/HumanInteraction'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HumanInteraction', () => {
  beforeEach(() => {
    mockActivePipelineId.current = null
    mockQuestions.current = new Map()
    mockRemoveQuestion.mockClear()
    mockSubmitAnswer.mockClear()
    mockSubmitAnswer.mockResolvedValue({ status: 'ok' })
  })

  it('shows empty state when no pending questions', () => {
    mockActivePipelineId.current = 'pipe-1'
    mockQuestions.current = new Map([['pipe-1', []]])

    render(<HumanInteraction />)

    expect(screen.getByText('No pending questions.')).toBeInTheDocument()
  })

  it('renders confirmation question with Yes/No buttons', () => {
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-1',
      text: 'Do you want to proceed?',
      question_type: 'confirmation',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    expect(screen.getByText('Do you want to proceed?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument()
  })

  it('renders free_text question with input and submit button', () => {
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-2',
      text: 'What is your name?',
      question_type: 'free_text',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    expect(screen.getByText('What is your name?')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('renders single_select with option buttons', () => {
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-3',
      text: 'Choose your color:',
      question_type: 'single_select',
      options: [
        { key: 'red', label: 'Red' },
        { key: 'blue', label: 'Blue' },
        { key: 'green', label: 'Green' },
      ],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    expect(screen.getByText('Choose your color:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Red' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument()
  })

  it('renders multi_select with checkboxes and submit button', () => {
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-4',
      text: 'Select all that apply:',
      question_type: 'multi_select',
      options: [
        { key: 'a', label: 'Option A' },
        { key: 'b', label: 'Option B' },
      ],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    expect(screen.getByText('Select all that apply:')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Option B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('submits confirmation answer and removes question from store', async () => {
    const user = userEvent.setup()
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-1',
      text: 'Confirm action?',
      question_type: 'confirmation',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    await user.click(screen.getByRole('button', { name: /yes/i }))

    await waitFor(() => {
      expect(mockSubmitAnswer).toHaveBeenCalledWith('pipe-1', 'q-1', 'yes')
      expect(mockRemoveQuestion).toHaveBeenCalledWith('pipe-1', 'q-1')
    })
  })

  it('submits single_select answer', async () => {
    const user = userEvent.setup()
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-3',
      text: 'Pick one:',
      question_type: 'single_select',
      options: [
        { key: 'opt-a', label: 'Option A' },
        { key: 'opt-b', label: 'Option B' },
      ],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    render(<HumanInteraction />)

    await user.click(screen.getByRole('button', { name: 'Option A' }))

    await waitFor(() => {
      expect(mockSubmitAnswer).toHaveBeenCalledWith('pipe-1', 'q-3', 'opt-a')
      expect(mockRemoveQuestion).toHaveBeenCalledWith('pipe-1', 'q-3')
    })
  })

  it('has orange pulsing border when question is pending', () => {
    mockActivePipelineId.current = 'pipe-1'
    const question: QuestionResponse = {
      qid: 'q-1',
      text: 'A question',
      question_type: 'confirmation',
      options: [],
      created_at: '2024-01-01T00:00:00Z',
    }
    mockQuestions.current = new Map([['pipe-1', [question]]])

    const { container } = render(<HumanInteraction />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('border-2')
    expect(wrapper).toHaveClass('border-orange-500')
    expect(wrapper).toHaveClass('animate-pulse')
  })
})
