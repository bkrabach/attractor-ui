import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  listPipelines,
  createPipeline,
  getPipelineStatus,
  cancelPipeline,
  getQuestions,
  submitAnswer,
  getGraph,
  getCheckpoint,
  getContext,
} from '../../src/api/client'

// ---------------------------------------------------------------------------
// Mock fetch helper
// ---------------------------------------------------------------------------

function makeMockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  })
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  vi.stubGlobal('fetch', originalFetch)
})

// ---------------------------------------------------------------------------
// Test 1: listPipelines → GET /api/pipelines
// ---------------------------------------------------------------------------
describe('listPipelines', () => {
  it('sends GET to /api/pipelines and returns PipelineSummary[]', async () => {
    const mockData = [
      {
        id: 'pipe-1',
        status: 'running',
        started_at: '2024-01-15T10:00:00Z',
        completed_nodes: [],
        current_node: 'fetch',
      },
    ]
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await listPipelines()

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 2: createPipeline → POST /api/pipelines
// ---------------------------------------------------------------------------
describe('createPipeline', () => {
  it('sends POST to /api/pipelines with JSON body and returns CreatePipelineResponse', async () => {
    const mockData = { id: 'pipe-new', status: 'running' }
    const mockFetch = makeMockFetch(201, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const dot = 'digraph { A -> B }'
    const context = { env: 'prod' }
    const result = await createPipeline(dot, context)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init?.body as string)).toEqual({ dot, context })
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 3: getPipelineStatus → GET /api/pipelines/{id}
// ---------------------------------------------------------------------------
describe('getPipelineStatus', () => {
  it('sends GET to /api/pipelines/{id} and returns PipelineStatusResponse', async () => {
    const mockData = {
      id: 'pipe-abc',
      status: 'completed',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: ['A', 'B'],
      current_node: null,
    }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await getPipelineStatus('pipe-abc')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 4: cancelPipeline → POST /api/pipelines/{id}/cancel
// ---------------------------------------------------------------------------
describe('cancelPipeline', () => {
  it('sends POST to /api/pipelines/{id}/cancel and returns CancelResponse', async () => {
    const mockData = { status: 'cancelled' }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await cancelPipeline('pipe-xyz')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-xyz/cancel')
    expect(init?.method).toBe('POST')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 5: getQuestions → GET /api/pipelines/{id}/questions
// ---------------------------------------------------------------------------
describe('getQuestions', () => {
  it('sends GET to /api/pipelines/{id}/questions and returns QuestionsResponse', async () => {
    const mockData = {
      questions: [
        {
          qid: 'q-1',
          text: 'Proceed?',
          question_type: 'confirmation',
          options: [],
          created_at: '2024-01-15T10:31:00Z',
        },
      ],
    }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await getQuestions('pipe-abc')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc/questions')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 6: submitAnswer → POST /api/pipelines/{id}/questions/{qid}/answer
// ---------------------------------------------------------------------------
describe('submitAnswer', () => {
  it('sends POST to /api/pipelines/{id}/questions/{qid}/answer with JSON body', async () => {
    const mockData = { status: 'accepted' }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await submitAnswer('pipe-abc', 'q-1', 'yes')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc/questions/q-1/answer')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init?.body as string)).toEqual({ answer: 'yes' })
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 7: getGraph → GET /api/pipelines/{id}/graph (with optional format)
// ---------------------------------------------------------------------------
describe('getGraph', () => {
  it('sends GET to /api/pipelines/{id}/graph with optional ?format= query param', async () => {
    const mockData = { dot: 'digraph { A -> B }', format: 'svg' }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await getGraph('pipe-abc', 'svg')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc/graph?format=svg')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 8: getCheckpoint → GET /api/pipelines/{id}/checkpoint
// ---------------------------------------------------------------------------
describe('getCheckpoint', () => {
  it('sends GET to /api/pipelines/{id}/checkpoint and returns checkpoint object', async () => {
    const mockData = { checkpoint: { step: 2, state: { foo: 'bar' } } }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await getCheckpoint('pipe-abc')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc/checkpoint')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 9: getContext → GET /api/pipelines/{id}/context
// ---------------------------------------------------------------------------
describe('getContext', () => {
  it('sends GET to /api/pipelines/{id}/context and returns Record<string, unknown>', async () => {
    const mockData = { env: 'production', version: '1.2.3' }
    const mockFetch = makeMockFetch(200, mockData)
    vi.stubGlobal('fetch', mockFetch)

    const result = await getContext('pipe-abc')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pipelines/pipe-abc/context')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual(mockData)
  })
})

// ---------------------------------------------------------------------------
// Test 10: error handling → ApiError thrown with server error details on 404
// ---------------------------------------------------------------------------
describe('error handling', () => {
  it('throws ApiError with code and statusCode from server error body on non-2xx', async () => {
    const serverErrorBody = {
      error: {
        code: 'NOT_FOUND',
        message: 'Pipeline not found',
        status: 404,
      },
    }
    const mockFetch = makeMockFetch(404, serverErrorBody)
    vi.stubGlobal('fetch', mockFetch)

    await expect(getPipelineStatus('no-such-id')).rejects.toThrow(ApiError)

    try {
      await getPipelineStatus('no-such-id')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.statusCode).toBe(404)
      expect(apiErr.code).toBe('NOT_FOUND')
      expect(apiErr.message).toBe('Pipeline not found')
    }
  })
})
