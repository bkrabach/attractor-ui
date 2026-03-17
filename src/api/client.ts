import type {
  PipelineSummary,
  CreatePipelineResponse,
  PipelineStatusResponse,
  CancelResponse,
  QuestionsResponse,
  AnswerResponse,
  GraphResponse,
  NodeResponseResult,
  ServerError,
} from './types'

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  // Try to parse server error envelope { error: { code, message, status } }
  let body: ServerError | null = null
  try {
    body = (await response.json()) as ServerError
  } catch {
    // If parsing fails, fall back to generic error
  }

  if (body?.error) {
    throw new ApiError(body.error.message, body.error.code, body.error.status)
  }

  throw new ApiError(
    `HTTP error ${response.status}`,
    'HTTP_ERROR',
    response.status,
  )
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'GET' })
  return handleResponse<T>(response)
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/** GET /api/pipelines — list all pipelines */
export function listPipelines(): Promise<PipelineSummary[]> {
  return get<PipelineSummary[]>('/api/pipelines')
}

/** POST /api/pipelines — create a new pipeline */
export function createPipeline(
  dot: string,
  context: Record<string, unknown>,
): Promise<CreatePipelineResponse> {
  return post<CreatePipelineResponse>('/api/pipelines', { dot, context })
}

/** GET /api/pipelines/{id} — get pipeline status */
export function getPipelineStatus(id: string): Promise<PipelineStatusResponse> {
  return get<PipelineStatusResponse>(`/api/pipelines/${id}`)
}

/** POST /api/pipelines/{id}/cancel — cancel a running pipeline */
export function cancelPipeline(id: string): Promise<CancelResponse> {
  return post<CancelResponse>(`/api/pipelines/${id}/cancel`)
}

/** GET /api/pipelines/{id}/questions — get pending questions */
export function getQuestions(id: string): Promise<QuestionsResponse> {
  return get<QuestionsResponse>(`/api/pipelines/${id}/questions`)
}

/** POST /api/pipelines/{id}/questions/{qid}/answer — submit an answer */
export function submitAnswer(
  id: string,
  qid: string,
  answer: string,
): Promise<AnswerResponse> {
  return post<AnswerResponse>(
    `/api/pipelines/${id}/questions/${qid}/answer`,
    { answer },
  )
}

/** GET /api/pipelines/{id}/graph — get pipeline graph (optional format param) */
export function getGraph(id: string, format?: string): Promise<GraphResponse> {
  const url = format
    ? `/api/pipelines/${id}/graph?format=${encodeURIComponent(format)}`
    : `/api/pipelines/${id}/graph`
  return get<GraphResponse>(url)
}

/** GET /api/pipelines/{id}/checkpoint — get pipeline checkpoint */
export function getCheckpoint(id: string): Promise<{ checkpoint: unknown }> {
  return get<{ checkpoint: unknown }>(`/api/pipelines/${id}/checkpoint`)
}

/** GET /api/pipelines/{id}/context — get pipeline context */
export function getContext(id: string): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(`/api/pipelines/${id}/context`)
}

/** GET /api/pipelines/{id}/nodes/{nodeId}/response — get LLM response artifact */
export function getNodeResponse(id: string, nodeId: string): Promise<NodeResponseResult> {
  return get<NodeResponseResult>(`/api/pipelines/${id}/nodes/${encodeURIComponent(nodeId)}/response`)
}
