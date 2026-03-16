import { useState } from 'react'
import type { QuestionResponse } from '../api/types'
import { submitAnswer } from '../api/client'
import { usePipelineStore } from '../store/pipelines'

// ---------------------------------------------------------------------------
// QuestionCard sub-component
// ---------------------------------------------------------------------------

interface QuestionCardProps {
  pipelineId: string
  question: QuestionResponse
  onRemove: (pipelineId: string, qid: string) => void
}

function QuestionCard({ pipelineId, question, onRemove }: QuestionCardProps) {
  const [freeTextValue, setFreeTextValue] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (answer: string) => {
    setError(null)
    try {
      await submitAnswer(pipelineId, question.qid, answer)
      onRemove(pipelineId, question.qid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="rounded-md border border-gray-700 bg-gray-900 p-3 space-y-2">
      <p className="text-sm text-gray-200">{question.text}</p>

      {question.question_type === 'confirmation' && (
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-green-700 hover:bg-green-600 text-white"
            onClick={() => handleSubmit('yes')}
          >
            Yes
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-red-700 hover:bg-red-600 text-white"
            onClick={() => handleSubmit('no')}
          >
            No
          </button>
        </div>
      )}

      {question.question_type === 'single_select' && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.key}
              className="px-3 py-1 text-sm rounded bg-blue-700 hover:bg-blue-600 text-white"
              onClick={() => handleSubmit(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'multi_select' && (
        <div className="space-y-1">
          {question.options.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                aria-label={opt.label}
                checked={selectedKeys.has(opt.key)}
                onChange={() => toggleKey(opt.key)}
                className="accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
          <button
            className="mt-2 px-3 py-1 text-sm rounded bg-blue-700 hover:bg-blue-600 text-white"
            onClick={() => handleSubmit(Array.from(selectedKeys).join(','))}
          >
            Submit
          </button>
        </div>
      )}

      {question.question_type === 'free_text' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={freeTextValue}
            onChange={(e) => setFreeTextValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm rounded bg-gray-800 border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button
            className="px-3 py-1 text-sm rounded bg-blue-700 hover:bg-blue-600 text-white"
            onClick={() => handleSubmit(freeTextValue.trim())}
          >
            Submit
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HumanInteraction component
// ---------------------------------------------------------------------------

export function HumanInteraction() {
  const { activePipelineId, questions, removeQuestion } = usePipelineStore()

  const pendingQuestions: QuestionResponse[] = activePipelineId
    ? (questions.get(activePipelineId) ?? [])
    : []

  const hasPending = pendingQuestions.length > 0

  return (
    <div
      className={`flex flex-col h-full bg-gray-950 overflow-hidden${hasPending ? ' border-2 border-orange-500 animate-pulse' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-sm font-medium text-gray-200">Questions</span>
        <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">
          {pendingQuestions.length}
        </span>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pendingQuestions.length === 0 ? (
          <div className="text-gray-500 text-sm">No pending questions.</div>
        ) : (
          pendingQuestions.map((q) => (
            <QuestionCard
              key={q.qid}
              pipelineId={activePipelineId!}
              question={q}
              onRemove={removeQuestion}
            />
          ))
        )}
      </div>
    </div>
  )
}
