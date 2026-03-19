import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FileViewer } from '../components/FileViewer'

// ---------------------------------------------------------------------------
// Tests
//
// The actual FileViewer component uses `updateSignal?: number` (an
// incrementing counter) rather than a boolean. The "Updated just now"
// banner appears when updateSignal increments from a non-zero value.
// ---------------------------------------------------------------------------

describe('FileViewer', () => {
  // --- Empty / loading / error states ---

  it('shows empty state when no file selected', () => {
    render(
      <FileViewer filePath={null} content={null} loading={false} error={null} />,
    )
    expect(screen.getByText(/select a file/i)).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(
      <FileViewer filePath="test.md" content={null} loading={true} error={null} />,
    )
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message with retry button that calls onRetry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <FileViewer
        filePath="test.md"
        content={null}
        loading={false}
        error="File not found"
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText('File not found')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()

    // Actually click the retry button and verify callback
    await user.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows "No content" when filePath is set but content is null', () => {
    render(
      <FileViewer filePath="test.txt" content={null} loading={false} error={null} />,
    )
    expect(screen.getByText(/no content/i)).toBeInTheDocument()
  })

  // --- Content rendering ---

  it('renders plain text content for unknown file types', () => {
    render(
      <FileViewer filePath="readme.txt" content="Hello world" loading={false} error={null} />,
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders markdown content as HTML by default', () => {
    render(
      <FileViewer filePath="docs/plan.md" content="# Plan Title" loading={false} error={null} />,
    )
    // Markdown renderer should produce an h1
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Plan Title')
  })

  it('renders code files with syntax highlighting and line numbers', () => {
    const { container } = render(
      <FileViewer filePath="main.rs" content="fn main() {}" loading={false} error={null} />,
    )
    // prism-react-renderer produces a <pre> with styled tokens
    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    // Line numbers are present
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  // --- Toolbar ---

  it('renders file path in toolbar', () => {
    render(
      <FileViewer filePath="docs/plan.md" content="# Plan" loading={false} error={null} />,
    )
    expect(screen.getByTitle('docs/plan.md')).toBeInTheDocument()
  })

  it('shows Raw/Rendered toggle for markdown files and toggles view', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <FileViewer filePath="docs/plan.md" content="# Hello" loading={false} error={null} />,
    )
    // Default: rendered mode, button says "Raw"
    const toggleBtn = screen.getByRole('button', { name: /raw/i })
    expect(toggleBtn).toBeInTheDocument()

    // Rendered mode: heading should exist (react-markdown renders <h1>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    // Click to switch to raw mode
    await user.click(toggleBtn)
    // In raw mode, no heading role (raw mode uses Highlight for .md files)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    // prism-react-renderer tokenizes the content, so check the <pre> exists
    // with the raw source content
    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre?.textContent).toContain('# Hello')
    // Button now says "Rendered"
    expect(screen.getByRole('button', { name: /rendered/i })).toBeInTheDocument()
  })

  it('shows refresh button that calls onRefresh when clicked', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    render(
      <FileViewer
        filePath="test.txt"
        content="content"
        loading={false}
        error={null}
        onRefresh={onRefresh}
      />,
    )
    const refreshBtn = screen.getByTitle('Refresh')
    expect(refreshBtn).toBeInTheDocument()

    await user.click(refreshBtn)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not show refresh button when onRefresh not provided', () => {
    render(
      <FileViewer
        filePath="test.txt"
        content="content"
        loading={false}
        error={null}
      />,
    )
    expect(screen.queryByTitle('Refresh')).not.toBeInTheDocument()
  })

  // --- Update banner ---

  it('shows "Updated just now" banner when updateSignal increments', () => {
    // Must start at 0, then rerender with 1 to simulate an actual increment.
    // On initial mount, the filePath effect runs last and clears showBanner.
    const { rerender } = render(
      <FileViewer
        filePath="test.txt"
        content="old content"
        loading={false}
        error={null}
        updateSignal={0}
      />,
    )
    expect(screen.queryByText(/updated just now/i)).not.toBeInTheDocument()

    // Simulate an update signal increment (e.g. from a poll detecting a change)
    rerender(
      <FileViewer
        filePath="test.txt"
        content="new content"
        loading={false}
        error={null}
        updateSignal={1}
      />,
    )
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument()
  })
})
