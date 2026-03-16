import { useState } from 'react'
import type { PipelineSummary } from '../api/types'
import { createPipeline } from '../api/client'
import { usePipelineStore } from '../store/pipelines'

interface NewPipelineDialogProps {
  open: boolean
  onClose: () => void
}

export function NewPipelineDialog({ open, onClose }: NewPipelineDialogProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste')
  const [dotText, setDotText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { pipelines, setPipelines, setActivePipeline } = usePipelineStore()

  if (!open) return null

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setDotText(content)
      setActiveTab('paste')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleRun = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await createPipeline(dotText, {})

      const newPipeline: PipelineSummary = {
        id: response.id,
        status: response.status,
        started_at: new Date().toISOString(),
        completed_nodes: [],
        current_node: null,
      }

      const existingPipelines = Array.from(pipelines.values())
      setPipelines([...existingPipelines, newPipeline])
      setActivePipeline(response.id)

      setDotText('')
      setActiveTab('paste')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg text-white">
        <h2 className="text-xl font-bold mb-4">New Pipeline</h2>

        {/* Tabs */}
        <div role="tablist" className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
          <button
            role="tab"
            aria-selected={activeTab === 'paste'}
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Paste DOT
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Paste DOT tab */}
        {activeTab === 'paste' && (
          <textarea
            className="w-full h-48 bg-gray-800 text-white p-3 rounded font-mono text-sm resize-none border border-gray-700 focus:outline-none focus:border-blue-500"
            placeholder="digraph { ... }"
            value={dotText}
            onChange={(e) => setDotText(e.target.value)}
          />
        )}

        {/* Upload File tab */}
        {activeTab === 'upload' && (
          <div
            className="w-full h-48 bg-gray-800 border-2 border-dashed border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="text-center text-gray-400">
              <p className="text-sm">Drop a .dot or .gv file here</p>
              <p className="text-xs mt-1 text-gray-500">or</p>
              <label className="mt-2 block cursor-pointer text-blue-400 hover:text-blue-300 text-sm">
                Browse files
                <input
                  type="file"
                  accept=".dot,.gv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-sm mt-2" role="alert">
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={!dotText.trim() || submitting}
            className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Starting...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  )
}
