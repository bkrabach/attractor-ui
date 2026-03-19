import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Code2, Braces, File } from 'lucide-react'
import type { FileNode } from '../api/types'
import { getFileIconType } from '../utils/fileTypes'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_SET = new Set<string>()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileTreeProps {
  nodes: FileNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
  /** Set of file paths that have been modified since last viewed */
  modifiedPaths?: Set<string>
  /** Set of file paths that are newly created in this run */
  newPaths?: Set<string>
  className?: string
}

interface TreeNodeProps {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  modifiedPaths: Set<string>
  newPaths: Set<string>
}

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

function FileIcon({ filename }: { filename: string }) {
  const iconType = getFileIconType(filename)
  const size = 14
  switch (iconType) {
    case 'markdown':
      return <FileText size={size} className="text-blue-400 shrink-0" />
    case 'code':
      return <Code2 size={size} className="text-green-400 shrink-0" />
    case 'config':
      return <Braces size={size} className="text-amber-400 shrink-0" />
    default:
      return <File size={size} className="text-gray-400 shrink-0" />
  }
}

// ---------------------------------------------------------------------------
// TreeNode (recursive)
// ---------------------------------------------------------------------------

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  toggleDir,
  modifiedPaths,
  newPaths,
}: TreeNodeProps) {
  const isDir = node.type === 'directory'
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedPath === node.path
  const isModified = modifiedPaths.has(node.path)
  const isNew = newPaths.has(node.path)

  const handleClick = () => {
    if (isDir) {
      toggleDir(node.path)
    } else {
      onSelect(node.path)
    }
  }

  return (
    <li role="none">
      <button
        role="treeitem"
        aria-expanded={isDir ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-level={depth + 1}
        className={`w-full flex items-center gap-1.5 py-0.5 px-1 text-xs rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-900/50 text-blue-200'
            : 'text-gray-300 hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
        title={node.path}
      >
        {/* Expand/collapse chevron for directories */}
        {isDir ? (
          isExpanded ? (
            <ChevronDown size={12} className="text-gray-500 shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-gray-500 shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" /> /* spacer for alignment */
        )}

        {/* Icon */}
        {isDir ? (
          isExpanded ? (
            <FolderOpen size={14} className="text-amber-400 shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400 shrink-0" />
          )
        ) : (
          <FileIcon filename={node.name} />
        )}

        {/* Name */}
        <span className="truncate">{node.name}</span>

        {/* Change indicators */}
        {isModified && !isNew && (
          <span className="text-amber-400 text-[10px] ml-auto shrink-0" title="Modified">{'\u25cf'}</span>
        )}
        {isNew && (
          <span className="text-emerald-400 text-[9px] ml-auto shrink-0 bg-emerald-900/50 px-1 rounded">New</span>
        )}
      </button>

      {/* Children (expanded directories only) */}
      {isDir && isExpanded && node.children && (
        <ul role="group" aria-label={node.name}>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              modifiedPaths={modifiedPaths}
              newPaths={newPaths}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// FileTree (exported)
// ---------------------------------------------------------------------------

export function FileTree({
  nodes,
  selectedPath,
  onSelect,
  modifiedPaths = EMPTY_SET,
  newPaths = EMPTY_SET,
  className = '',
}: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  if (nodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 text-gray-500 text-xs ${className}`}>
        <Folder size={24} className="text-gray-600 mb-2 animate-pulse" />
        <p>No files yet.</p>
        <p className="text-gray-600 mt-1">Files will appear here once the pipeline runs.</p>
      </div>
    )
  }

  return (
    <ul role="tree" aria-label="File explorer" className={`overflow-y-auto ${className}`}>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
          modifiedPaths={modifiedPaths}
          newPaths={newPaths}
        />
      ))}
    </ul>
  )
}
