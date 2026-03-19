import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { FileNode } from '../api/types'
import { FileTree } from './FileTree'
import { FileViewer } from './FileViewer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileExplorerProps {
  /** Fetch the directory tree from the server */
  onFetchTree: () => Promise<FileNode[]>
  /** Fetch a file's content from the server */
  onFetchFile: (path: string) => Promise<string>
  /** Polling interval in ms (default 5000, 0 to disable) */
  pollInterval?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all file paths from a tree, with their modified_at timestamps. */
function collectFileInfo(
  nodes: FileNode[],
  result: Map<string, { modified_at?: string; size?: number }> = new Map(),
): Map<string, { modified_at?: string; size?: number }> {
  for (const node of nodes) {
    if (node.type === 'file') {
      result.set(node.path, { modified_at: node.modified_at, size: node.size })
    }
    if (node.children) {
      collectFileInfo(node.children, result)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// FileExplorer (exported)
// ---------------------------------------------------------------------------

export function FileExplorer({
  onFetchTree,
  onFetchFile,
  pollInterval = 5000,
  className = '',
}: FileExplorerProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [updateSignal, setUpdateSignal] = useState(0)
  const [narrowMode, setNarrowMode] = useState(false)
  const [showViewer, setShowViewer] = useState(false) // narrow mode navigation

  // Track previously known files for change detection
  const prevFileInfo = useRef(new Map<string, { modified_at?: string; size?: number }>())
  const [modifiedPaths, setModifiedPaths] = useState(new Set<string>())
  const [newPaths, setNewPaths] = useState(new Set<string>())
  const viewedPaths = useRef(new Set<string>())

  // Use ref for selectedPath so fetchTree doesn't need it as a dep (avoids poll resets)
  const selectedPathRef = useRef<string | null>(null)
  selectedPathRef.current = selectedPath

  // Track container width for narrow mode
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setNarrowMode(entry.contentRect.width < 480)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // --- Fetch tree with change detection ---
  // Uses refs for selectedPath to avoid rebuilding fetchTree (and resetting polling) on file select
  const fetchTree = useCallback(async () => {
    try {
      const newTree = await onFetchTree()
      const newInfo = collectFileInfo(newTree)
      const oldInfo = prevFileInfo.current

      // Detect new and modified files — merge with existing unviewed entries
      // so badges persist until the user actually views the file (fixes CRITICAL #4)
      setModifiedPaths((prevModified) => {
        const merged = new Set(prevModified)
        for (const [path, info] of newInfo) {
          const old = oldInfo.get(path)
          if (old && (old.modified_at !== info.modified_at || old.size !== info.size)) {
            if (!viewedPaths.current.has(path)) {
              merged.add(path)
            }
          }
        }
        // Remove paths that no longer exist in the tree
        for (const path of merged) {
          if (!newInfo.has(path)) merged.delete(path)
        }
        return merged
      })

      setNewPaths((prevNew) => {
        const merged = new Set(prevNew)
        for (const [path] of newInfo) {
          const old = oldInfo.get(path)
          if (!old && !viewedPaths.current.has(path)) {
            merged.add(path)
          }
        }
        // Remove paths that no longer exist
        for (const path of merged) {
          if (!newInfo.has(path)) merged.delete(path)
        }
        return merged
      })

      prevFileInfo.current = newInfo
      setTree(newTree)

      // If the selected file was modified, re-fetch its content
      const curSelected = selectedPathRef.current
      if (curSelected && newInfo.has(curSelected)) {
        const old = oldInfo.get(curSelected)
        const cur = newInfo.get(curSelected)
        const changed = !old || old.modified_at !== cur?.modified_at || old.size !== cur?.size
        if (changed) {
          try {
            const content = await onFetchFile(curSelected)
            setFileContent(content)
            setUpdateSignal((prev) => prev + 1)
          } catch {
            // Don't overwrite existing content on poll error
          }
        }
      }
    } catch {
      // Silent retry on next interval (per design doc)
    }
  }, [onFetchTree, onFetchFile])

  // --- Initial fetch and polling ---
  useEffect(() => {
    fetchTree()

    if (pollInterval <= 0) return

    const interval = setInterval(fetchTree, pollInterval)
    return () => clearInterval(interval)
  }, [fetchTree, pollInterval])

  // --- File selection handler ---
  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path)
      setFileLoading(true)
      setFileError(null)
      setFileContent(null)
      setShowViewer(true) // navigate to viewer in narrow mode

      // Mark as viewed (clears change indicator)
      viewedPaths.current.add(path)
      setModifiedPaths((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
      setNewPaths((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })

      try {
        const content = await onFetchFile(path)
        setFileContent(content)
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setFileLoading(false)
      }
    },
    [onFetchFile],
  )

  const handleRefresh = useCallback(async () => {
    if (!selectedPath) return
    setFileLoading(true)
    setFileError(null)
    try {
      const content = await onFetchFile(selectedPath)
      setFileContent(content)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setFileLoading(false)
    }
  }, [selectedPath, onFetchFile])

  // --- Narrow mode: single-column navigation ---
  if (narrowMode) {
    return (
      <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
        {showViewer && selectedPath ? (
          <>
            <button
              onClick={() => setShowViewer(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border-b border-gray-800 shrink-0"
            >
              <ArrowLeft size={12} />
              Files
            </button>
            <FileViewer
              filePath={selectedPath}
              content={fileContent}
              loading={fileLoading}
              error={fileError}
              onRefresh={handleRefresh}
              onRetry={handleRefresh}
              updateSignal={updateSignal}
              className="flex-1"
            />
          </>
        ) : (
          <FileTree
            nodes={tree}
            selectedPath={selectedPath}
            onSelect={handleFileSelect}
            modifiedPaths={modifiedPaths}
            newPaths={newPaths}
            className="flex-1"
          />
        )}
      </div>
    )
  }

  // --- Normal mode: split pane ---
  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* Tree pane (fixed 220px) */}
      <div className="w-[220px] shrink-0 border-r border-gray-800 overflow-y-auto">
        <FileTree
          nodes={tree}
          selectedPath={selectedPath}
          onSelect={handleFileSelect}
          modifiedPaths={modifiedPaths}
          newPaths={newPaths}
          className="h-full"
        />
      </div>

      {/* Viewer pane (flex) */}
      <div className="flex-1 min-w-0">
        <FileViewer
          filePath={selectedPath}
          content={fileContent}
          loading={fileLoading}
          error={fileError}
          onRefresh={handleRefresh}
          onRetry={handleRefresh}
          updateSignal={updateSignal}
          className="h-full"
        />
      </div>
    </div>
  )
}
