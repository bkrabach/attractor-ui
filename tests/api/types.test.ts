// Import a value export to ensure module resolution fails if file doesn't exist
// (esbuild strips type-only imports, making the RED phase impossible without a value import)
import {
  type PipelineSummary,
  type PipelineStatusResponse,
  type CreatePipelineRequest,
  type CreatePipelineResponse,
  type QuestionResponse,
  type GraphResponse,
  type PipelineEvent,
  API_TYPES_SCHEMA_VERSION,
} from '../../src/api/types'

// ---------------------------------------------------------------------------
// Sanity: verify the module is actually loaded (fails until types.ts exists)
// ---------------------------------------------------------------------------
describe('types module', () => {
  it('exports API_TYPES_SCHEMA_VERSION sentinel', () => {
    expect(API_TYPES_SCHEMA_VERSION).toBe('1')
  })
})

// ---------------------------------------------------------------------------
// Test 1: PipelineSummary matches server JSON shape
// ---------------------------------------------------------------------------
describe('PipelineSummary', () => {
  it('accepts server JSON shape with all fields', () => {
    const summary: PipelineSummary = {
      id: 'pipeline-abc123',
      status: 'running',
      started_at: '2024-01-15T10:30:00Z',
      completed_nodes: ['fetch-data', 'validate'],
      current_node: 'transform',
    }
    expect(summary.id).toBe('pipeline-abc123')
    expect(summary.status).toBe('running')
    expect(summary.completed_nodes).toHaveLength(2)
    expect(summary.current_node).toBe('transform')
  })
})

// ---------------------------------------------------------------------------
// Test 2: PipelineStatusResponse matches server JSON shape
// ---------------------------------------------------------------------------
describe('PipelineStatusResponse', () => {
  it('accepts server JSON shape with null current_node', () => {
    const response: PipelineStatusResponse = {
      id: 'pipeline-xyz',
      status: 'completed',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: ['fetch', 'process', 'publish'],
      current_node: null,
    }
    expect(response.status).toBe('completed')
    expect(response.current_node).toBeNull()
    expect(response.completed_nodes).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Test 3: CreatePipelineRequest matches expected shape
// ---------------------------------------------------------------------------
describe('CreatePipelineRequest', () => {
  it('accepts dot and context fields', () => {
    const request: CreatePipelineRequest = {
      dot: 'digraph { A -> B }',
      context: { env: 'production', version: '1.2.3' },
    }
    expect(request.dot).toBe('digraph { A -> B }')
    expect(request.context['env']).toBe('production')
  })
})

// ---------------------------------------------------------------------------
// Test 4: CreatePipelineResponse matches server JSON shape
// ---------------------------------------------------------------------------
describe('CreatePipelineResponse', () => {
  it('accepts id and status fields', () => {
    const response: CreatePipelineResponse = {
      id: 'new-pipeline-001',
      status: 'running',
    }
    expect(response.id).toBe('new-pipeline-001')
    expect(response.status).toBe('running')
  })
})

// ---------------------------------------------------------------------------
// Test 5: QuestionResponse with options
// ---------------------------------------------------------------------------
describe('QuestionResponse', () => {
  it('accepts server JSON shape with options array', () => {
    const question: QuestionResponse = {
      qid: 'q-001',
      text: 'Which environment?',
      question_type: 'single_select',
      options: [
        { key: '1', label: 'Production' },
        { key: '2', label: 'Staging' },
      ],
      created_at: '2024-01-15T10:31:00Z',
    }
    expect(question.qid).toBe('q-001')
    expect(question.question_type).toBe('single_select')
    expect(question.options).toHaveLength(2)
    expect(question.options[0]?.key).toBe('1')
    expect(question.options[1]?.label).toBe('Staging')
  })

  // -------------------------------------------------------------------------
  // Test 6: QuestionResponse without options (free_text)
  // -------------------------------------------------------------------------
  it('accepts server JSON shape with empty options for free_text', () => {
    const question: QuestionResponse = {
      qid: 'q-002',
      text: 'Enter your deployment notes:',
      question_type: 'free_text',
      options: [],
      created_at: '2024-01-15T10:32:00Z',
    }
    expect(question.question_type).toBe('free_text')
    expect(question.options).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Test 7: GraphResponse matches server JSON shape
// ---------------------------------------------------------------------------
describe('GraphResponse', () => {
  it('accepts dot and format fields', () => {
    const graph: GraphResponse = {
      dot: 'digraph pipeline { rankdir=LR; A -> B -> C; }',
      format: 'dot',
    }
    expect(graph.dot).toContain('digraph')
    expect(graph.format).toBe('dot')
  })
})

// ---------------------------------------------------------------------------
// Tests 8–10: PipelineEvent discriminated union narrows on event field
// ---------------------------------------------------------------------------
describe('PipelineEvent discriminated union', () => {
  it('narrows to StageStartedEvent on stage_started', () => {
    const event: PipelineEvent = { event: 'stage_started', name: 'fetch-data', index: 0 }
    if (event.event === 'stage_started') {
      expect(event.name).toBe('fetch-data')
      expect(event.index).toBe(0)
    } else {
      throw new Error('Expected stage_started event')
    }
  })

  it('narrows to StageCompletedEvent on stage_completed', () => {
    const event: PipelineEvent = {
      event: 'stage_completed',
      name: 'fetch-data',
      index: 0,
      duration: { __duration_ms: 1500 },
    }
    if (event.event === 'stage_completed') {
      expect(event.name).toBe('fetch-data')
      expect(event.duration.__duration_ms).toBe(1500)
    } else {
      throw new Error('Expected stage_completed event')
    }
  })

  it('narrows to InterviewStartedEvent on interview_started', () => {
    const event: PipelineEvent = {
      event: 'interview_started',
      question: 'Proceed with deployment?',
      stage: 'confirm-deploy',
    }
    if (event.event === 'interview_started') {
      expect(event.question).toBe('Proceed with deployment?')
      expect(event.stage).toBe('confirm-deploy')
    } else {
      throw new Error('Expected interview_started event')
    }
  })

  it('narrows to PipelineCompletedEvent on pipeline_completed', () => {
    const event: PipelineEvent = {
      event: 'pipeline_completed',
      duration: { __duration_ms: 45000 },
      artifact_count: 3,
    }
    if (event.event === 'pipeline_completed') {
      expect(event.artifact_count).toBe(3)
      expect(event.duration.__duration_ms).toBe(45000)
    } else {
      throw new Error('Expected pipeline_completed event')
    }
  })

  it('narrows to PipelineFailedEvent on pipeline_failed', () => {
    const event: PipelineEvent = {
      event: 'pipeline_failed',
      error: 'Stage fetch-data failed: connection timeout',
      duration: { __duration_ms: 5000 },
    }
    if (event.event === 'pipeline_failed') {
      expect(event.error).toContain('connection timeout')
      expect(event.duration.__duration_ms).toBe(5000)
    } else {
      throw new Error('Expected pipeline_failed event')
    }
  })
})
