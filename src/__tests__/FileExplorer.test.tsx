import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { FileNode } from '../api/types'
import { FileExplorer } from '../components/FileExplorer'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockTree: FileNode[] = [
  {
    name: 'docs',
    path: 'docs',
    type: 'directory',
    children: [
      {
        name: 'plan.md',
        path: 'docs/plan.md',
        type: 'file',
        size: 1234,
        modified_at: '2026-03-18T12:00:00Z',
      },
    ],
  },
  {
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    size: 200,
  },
]

// ---------------------------------------------------------------------------
// Note: ResizeObserver is globally mocked in test-setup.ts with 800px width,
// which is above the 480px narrow-mode threshold. This means tests run in
// normal (split pane) mode by default.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileExplorer', () => {
  it('fetches and displays the file tree on mount', async () => {
    const onFetchTree = vi.fn().mockResolvedValue(mockTree)
    const onFetchFile = vi.fn().mockResolvedValue('file content')

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={0}
      />,
    )

    // Wait for the tree to render (result, not just the call)
    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument()
    })

    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(onFetchTree).toHaveBeenCalledTimes(1)
  })

  it('shows file content when a file is clicked', async () => {
    const user = userEvent.setup()
    const onFetchTree = vi.fn().mockResolvedValue(mockTree)
    const onFetchFile = vi.fn().mockResolvedValue('Hello from README')

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={0}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    await user.click(screen.getByText('README.md'))

    await waitFor(() => {
      expect(onFetchFile).toHaveBeenCalledWith('README.md')
    })

    await waitFor(() => {
      expect(screen.getByText('Hello from README')).toBeInTheDocument()
    })
  })

  it('shows empty selection message before any file is clicked', async () => {
    const onFetchTree = vi.fn().mockResolvedValue(mockTree)
    const onFetchFile = vi.fn().mockResolvedValue('')

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={0}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument()
    })

    expect(screen.getByText(/select a file/i)).toBeInTheDocument()
  })

  it('shows empty state when tree is empty', async () => {
    const onFetchTree = vi.fn().mockResolvedValue([])
    const onFetchFile = vi.fn().mockResolvedValue('')

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={0}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/no files yet/i)).toBeInTheDocument()
    })
  })

  it('shows error in viewer when file fetch fails', async () => {
    const user = userEvent.setup()
    const onFetchTree = vi.fn().mockResolvedValue(mockTree)
    const onFetchFile = vi.fn().mockRejectedValue(new Error('Network error'))

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={0}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    await user.click(screen.getByText('README.md'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('polls for tree updates when pollInterval is set', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onFetchTree = vi.fn().mockResolvedValue(mockTree)
    const onFetchFile = vi.fn().mockResolvedValue('')

    render(
      <FileExplorer
        onFetchTree={onFetchTree}
        onFetchFile={onFetchFile}
        pollInterval={5000}
      />,
    )

    // Initial fetch fires immediately on mount
    await vi.waitFor(() => {
      expect(onFetchTree).toHaveBeenCalledTimes(1)
    })

    // Advance time past one poll interval
    await vi.advanceTimersByTimeAsync(5100)
    expect(onFetchTree).toHaveBeenCalledTimes(2)

    // Another interval
    await vi.advanceTimersByTimeAsync(5100)
    expect(onFetchTree).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
  })
})
