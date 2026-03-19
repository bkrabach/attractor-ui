import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { FileNode } from '../api/types'
import { FileTree } from '../components/FileTree'

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
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        name: 'main.rs',
        path: 'src/main.rs',
        type: 'file',
        size: 500,
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
// Tests
// ---------------------------------------------------------------------------

describe('FileTree', () => {
  // --- Rendering ---

  it('renders empty state when no files', () => {
    render(<FileTree nodes={[]} selectedPath={null} onSelect={() => {}} />)
    expect(screen.getByText(/no files yet/i)).toBeInTheDocument()
  })

  it('renders top-level entries', () => {
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={() => {}} />)
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  // --- Expand / collapse ---

  it('expands directory on click to show children', async () => {
    const user = userEvent.setup()
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={() => {}} />)

    // Children should not be visible initially
    expect(screen.queryByText('plan.md')).not.toBeInTheDocument()

    // Click docs directory to expand
    await user.click(screen.getByText('docs'))
    expect(screen.getByText('plan.md')).toBeInTheDocument()
  })

  it('collapses directory on second click', async () => {
    const user = userEvent.setup()
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={() => {}} />)

    await user.click(screen.getByText('docs'))
    expect(screen.getByText('plan.md')).toBeInTheDocument()

    await user.click(screen.getByText('docs'))
    expect(screen.queryByText('plan.md')).not.toBeInTheDocument()
  })

  // --- File / directory click behavior ---

  it('calls onSelect when a file is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={onSelect} />)

    await user.click(screen.getByText('README.md'))
    expect(onSelect).toHaveBeenCalledWith('README.md')
  })

  it('does NOT call onSelect when a directory is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={onSelect} />)

    await user.click(screen.getByText('docs'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  // --- selectedPath highlighting ---

  it('marks the selected file with aria-selected', () => {
    render(
      <FileTree nodes={mockTree} selectedPath="README.md" onSelect={() => {}} />,
    )
    const selected = screen.getByRole('treeitem', { selected: true })
    expect(selected).toHaveTextContent('README.md')
  })

  // --- Change indicators ---

  it('shows modified indicator for modified files', () => {
    render(
      <FileTree
        nodes={mockTree}
        selectedPath={null}
        onSelect={() => {}}
        modifiedPaths={new Set(['README.md'])}
      />,
    )
    expect(screen.getByTitle('Modified')).toBeInTheDocument()
  })

  it('shows New badge for new files', () => {
    render(
      <FileTree
        nodes={mockTree}
        selectedPath={null}
        onSelect={() => {}}
        newPaths={new Set(['README.md'])}
      />,
    )
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  // --- Accessibility ---

  it('has tree role for accessibility', () => {
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={() => {}} />)
    expect(screen.getByRole('tree')).toBeInTheDocument()
  })

  it('sets aria-expanded on directory items', async () => {
    const user = userEvent.setup()
    render(<FileTree nodes={mockTree} selectedPath={null} onSelect={() => {}} />)

    // Directories start collapsed
    const docsButton = screen.getByRole('treeitem', { name: /docs/i })
    expect(docsButton).toHaveAttribute('aria-expanded', 'false')

    // After click, expanded
    await user.click(docsButton)
    expect(docsButton).toHaveAttribute('aria-expanded', 'true')
  })
})
