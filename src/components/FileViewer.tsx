import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Highlight, themes } from 'prism-react-renderer'
import { RefreshCw } from 'lucide-react'
import { isMarkdown, getLanguage } from '../utils/fileTypes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileViewerProps {
  /** Relative path of the file being viewed */
  filePath: string | null
  /** The file's text content, or null if loading/error */
  content: string | null
  /** Whether the content is currently loading */
  loading: boolean
  /** Error message, if any */
  error: string | null
  /** Called when the user clicks the refresh button */
  onRefresh?: () => void
  /** Called when the user clicks retry after an error */
  onRetry?: () => void
  /** Incremented when the file was just updated on disk (counter avoids boolean edge cleanup) */
  updateSignal?: number
  className?: string
}

// ---------------------------------------------------------------------------
// FileViewer (exported)
// ---------------------------------------------------------------------------

export function FileViewer({
  filePath,
  content,
  loading,
  error,
  onRefresh,
  onRetry,
  updateSignal = 0,
  className = '',
}: FileViewerProps) {
  const [showRendered, setShowRendered] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Show "Updated just now" banner when updateSignal increments.
  // Using a ref for the timer avoids the cleanup-on-dep-change issue
  // where a boolean toggle would cancel the dismiss timer.
  useEffect(() => {
    if (updateSignal === 0) return
    setShowBanner(true)
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = setTimeout(() => setShowBanner(false), 8000)
  }, [updateSignal])

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    }
  }, [])

  // Reset to rendered view when file changes
  useEffect(() => {
    setShowRendered(true)
    setShowBanner(false)
  }, [filePath])

  // --- Empty state ---
  if (!filePath) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 text-xs ${className}`}>
        Select a file to view its contents
      </div>
    )
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className={`p-3 space-y-2 ${className}`}>
        <div className="h-3 bg-gray-800 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-2/3 animate-pulse" />
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 text-xs ${className}`}>
        <p className="text-red-400">{error}</p>
        <p className="text-gray-500">{filePath}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const fileIsMarkdown = isMarkdown(filePath)
  const language = getLanguage(filePath)

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 text-xs text-gray-400 shrink-0">
        {/* Breadcrumb path */}
        <span className="truncate flex-1" title={filePath}>
          {filePath}
        </span>

        {/* Raw/Rendered toggle (markdown only) */}
        {fileIsMarkdown && (
          <button
            onClick={() => setShowRendered(!showRendered)}
            className="px-2 py-0.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
          >
            {showRendered ? 'Raw' : 'Rendered'}
          </button>
        )}

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-0.5 hover:text-gray-200 transition-colors"
            title="Refresh"
            aria-label="Refresh file"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Updated banner */}
      {showBanner && (
        <div className="px-2 py-1 bg-amber-900/50 border-b border-amber-700 text-amber-200 text-xs">
          Updated just now
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {content === null ? (
          <p className="text-gray-500 text-xs italic">No content</p>
        ) : fileIsMarkdown && showRendered ? (
          <div className="prose prose-invert prose-sm max-w-none text-gray-200">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          </div>
        ) : language ? (
          <Highlight theme={themes.nightOwl} code={content} language={language}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className="text-xs leading-relaxed overflow-x-auto rounded p-2"
                style={{ ...style, background: 'transparent' }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    <span className="text-gray-600 select-none mr-3 inline-block w-8 text-right">
                      {i + 1}
                    </span>
                    {line.map((token, j) => (
                      <span key={j} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        ) : (
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{content}</pre>
        )}
      </div>
    </div>
  )
}
