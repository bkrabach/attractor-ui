import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock functions so they're available in vi.mock factory
const mockSetPipelines = vi.hoisted(() => vi.fn())
const mockSetActivePipeline = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  createPipeline: vi.fn(),
}))

vi.mock('../store/pipelines', () => ({
  usePipelineStore: () => ({
    pipelines: new Map(),
    setPipelines: mockSetPipelines,
    setActivePipeline: mockSetActivePipeline,
  }),
}))

import { NewPipelineDialog } from '../components/NewPipelineDialog'
import { createPipeline } from '../api/client'

describe('NewPipelineDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with title', () => {
    render(<NewPipelineDialog open={true} onClose={() => {}} />)
    expect(screen.getByText(/New Pipeline/i)).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(<NewPipelineDialog open={false} onClose={() => {}} />)
    expect(screen.queryByText(/New Pipeline/i)).not.toBeInTheDocument()
  })

  it('has two tabs', () => {
    render(<NewPipelineDialog open={true} onClose={() => {}} />)
    expect(screen.getByRole('tab', { name: /Paste DOT/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Upload File/i })).toBeInTheDocument()
  })

  it('shows textarea on Paste DOT tab', () => {
    render(<NewPipelineDialog open={true} onClose={() => {}} />)
    expect(screen.getByPlaceholderText(/digraph/i)).toBeInTheDocument()
  })

  it('Run button is disabled when textarea is empty', () => {
    render(<NewPipelineDialog open={true} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^Run$/i })).toBeDisabled()
  })

  it('Run button is enabled when text is entered', () => {
    render(<NewPipelineDialog open={true} onClose={() => {}} />)
    const textarea = screen.getByPlaceholderText(/digraph/i)
    fireEvent.change(textarea, { target: { value: 'digraph { A -> B }' } })
    expect(screen.getByRole('button', { name: /^Run$/i })).not.toBeDisabled()
  })

  it('Cancel button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NewPipelineDialog open={true} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Run button calls createPipeline and closes dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.mocked(createPipeline).mockResolvedValueOnce({ id: 'pipe-1', status: 'running' })

    render(<NewPipelineDialog open={true} onClose={onClose} />)
    const textarea = screen.getByPlaceholderText(/digraph/i)
    fireEvent.change(textarea, { target: { value: 'digraph { A -> B }' } })
    await user.click(screen.getByRole('button', { name: /^Run$/i }))

    await waitFor(() => {
      expect(createPipeline).toHaveBeenCalledWith('digraph { A -> B }', {}, undefined)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
