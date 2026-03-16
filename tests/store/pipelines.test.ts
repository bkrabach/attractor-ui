import { describe, it, expect, beforeEach } from 'vitest'
import { usePipelineStore } from '../../src/store/pipelines'
import type { PipelineSummary, PipelineEvent, QuestionResponse } from '../../src/api/types'

// ---------------------------------------------------------------------------
// Helper: reset store to initial state before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  usePipelineStore.setState({
    pipelines: new Map(),
    activePipelineId: null,
    events: new Map(),
    questions: new Map(),
  })
})

// ---------------------------------------------------------------------------
// Test 1: empty initial state
// ---------------------------------------------------------------------------
describe('initial state', () => {
  it('has empty maps and null activePipelineId', () => {
    const state = usePipelineStore.getState()
    expect(state.pipelines.size).toBe(0)
    expect(state.activePipelineId).toBeNull()
    expect(state.events.size).toBe(0)
    expect(state.questions.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 2: setPipelines populates map
// ---------------------------------------------------------------------------
describe('setPipelines', () => {
  it('replaces pipeline map from array', () => {
    const list: PipelineSummary[] = [
      {
        id: 'pipe-1',
        status: 'running',
        started_at: '2024-01-15T10:00:00Z',
        completed_nodes: [],
        current_node: null,
      },
      {
        id: 'pipe-2',
        status: 'completed',
        started_at: '2024-01-15T09:00:00Z',
        completed_nodes: ['A', 'B'],
        current_node: null,
      },
    ]

    usePipelineStore.getState().setPipelines(list)

    const { pipelines } = usePipelineStore.getState()
    expect(pipelines.size).toBe(2)
    expect(pipelines.get('pipe-1')?.status).toBe('running')
    expect(pipelines.get('pipe-2')?.status).toBe('completed')
  })
})

// ---------------------------------------------------------------------------
// Test 3: setActivePipeline sets and clears
// ---------------------------------------------------------------------------
describe('setActivePipeline', () => {
  it('sets active pipeline id and can clear it with null', () => {
    usePipelineStore.getState().setActivePipeline('pipe-1')
    expect(usePipelineStore.getState().activePipelineId).toBe('pipe-1')

    usePipelineStore.getState().setActivePipeline(null)
    expect(usePipelineStore.getState().activePipelineId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 4: addEvent appends and creates list
// ---------------------------------------------------------------------------
describe('addEvent', () => {
  it('appends event to list and creates list if not present', () => {
    const event: PipelineEvent = { event: 'pipeline_started', name: 'my-pipeline', id: 'pipe-1' }

    usePipelineStore.getState().addEvent('pipe-1', event)

    const { events } = usePipelineStore.getState()
    expect(events.has('pipe-1')).toBe(true)
    expect(events.get('pipe-1')).toHaveLength(1)
    expect(events.get('pipe-1')?.[0]).toEqual(event)

    // Append a second event
    const event2: PipelineEvent = { event: 'stage_started', name: 'fetch-data', index: 0 }
    usePipelineStore.getState().addEvent('pipe-1', event2)
    // Re-read state after second addEvent (new Map is created for reactivity)
    expect(usePipelineStore.getState().events.get('pipe-1')).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Test 5: addEvent updates pipeline current_node on stage_started
// ---------------------------------------------------------------------------
describe('addEvent stage_started', () => {
  it('sets current_node on the pipeline when stage_started is received', () => {
    const pipeline: PipelineSummary = {
      id: 'pipe-1',
      status: 'running',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: [],
      current_node: null,
    }
    usePipelineStore.getState().setPipelines([pipeline])

    const event: PipelineEvent = { event: 'stage_started', name: 'fetch-data', index: 0 }
    usePipelineStore.getState().addEvent('pipe-1', event)

    const updated = usePipelineStore.getState().pipelines.get('pipe-1')
    expect(updated?.current_node).toBe('fetch-data')
  })
})

// ---------------------------------------------------------------------------
// Test 6: addEvent moves to completed_nodes on stage_completed
// ---------------------------------------------------------------------------
describe('addEvent stage_completed', () => {
  it('moves current_node to completed_nodes and clears current_node on stage_completed', () => {
    const pipeline: PipelineSummary = {
      id: 'pipe-1',
      status: 'running',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: [],
      current_node: 'fetch-data',
    }
    usePipelineStore.getState().setPipelines([pipeline])

    const event: PipelineEvent = {
      event: 'stage_completed',
      name: 'fetch-data',
      index: 0,
      duration: { __duration_ms: 1200 },
    }
    usePipelineStore.getState().addEvent('pipe-1', event)

    const updated = usePipelineStore.getState().pipelines.get('pipe-1')
    expect(updated?.completed_nodes).toContain('fetch-data')
    expect(updated?.current_node).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 7: addEvent marks completed on pipeline_completed
// ---------------------------------------------------------------------------
describe('addEvent pipeline_completed', () => {
  it('sets pipeline status to completed', () => {
    const pipeline: PipelineSummary = {
      id: 'pipe-1',
      status: 'running',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: ['fetch-data'],
      current_node: null,
    }
    usePipelineStore.getState().setPipelines([pipeline])

    const event: PipelineEvent = {
      event: 'pipeline_completed',
      duration: { __duration_ms: 45000 },
      artifact_count: 2,
    }
    usePipelineStore.getState().addEvent('pipe-1', event)

    const updated = usePipelineStore.getState().pipelines.get('pipe-1')
    expect(updated?.status).toBe('completed')
  })
})

// ---------------------------------------------------------------------------
// Test 8: addEvent marks failed on pipeline_failed
// ---------------------------------------------------------------------------
describe('addEvent pipeline_failed', () => {
  it('sets pipeline status to failed', () => {
    const pipeline: PipelineSummary = {
      id: 'pipe-1',
      status: 'running',
      started_at: '2024-01-15T10:00:00Z',
      completed_nodes: [],
      current_node: 'fetch-data',
    }
    usePipelineStore.getState().setPipelines([pipeline])

    const event: PipelineEvent = {
      event: 'pipeline_failed',
      error: 'connection timeout',
      duration: { __duration_ms: 5000 },
    }
    usePipelineStore.getState().addEvent('pipe-1', event)

    const updated = usePipelineStore.getState().pipelines.get('pipe-1')
    expect(updated?.status).toBe('failed')
  })
})

// ---------------------------------------------------------------------------
// Test 9: setQuestions sets array
// ---------------------------------------------------------------------------
describe('setQuestions', () => {
  it('sets questions array for a pipeline', () => {
    const questions: QuestionResponse[] = [
      {
        qid: 'q-1',
        text: 'Proceed with deployment?',
        question_type: 'confirmation',
        options: [],
        created_at: '2024-01-15T10:31:00Z',
      },
      {
        qid: 'q-2',
        text: 'Select environment',
        question_type: 'single_select',
        options: [
          { key: '1', label: 'Production' },
          { key: '2', label: 'Staging' },
        ],
        created_at: '2024-01-15T10:32:00Z',
      },
    ]

    usePipelineStore.getState().setQuestions('pipe-1', questions)

    const { questions: qMap } = usePipelineStore.getState()
    expect(qMap.get('pipe-1')).toHaveLength(2)
    expect(qMap.get('pipe-1')?.[0]?.qid).toBe('q-1')
    expect(qMap.get('pipe-1')?.[1]?.qid).toBe('q-2')
  })
})

// ---------------------------------------------------------------------------
// Test 10: removeQuestion removes by qid
// ---------------------------------------------------------------------------
describe('removeQuestion', () => {
  it('filters out question by qid', () => {
    const questions: QuestionResponse[] = [
      {
        qid: 'q-1',
        text: 'First question',
        question_type: 'confirmation',
        options: [],
        created_at: '2024-01-15T10:31:00Z',
      },
      {
        qid: 'q-2',
        text: 'Second question',
        question_type: 'free_text',
        options: [],
        created_at: '2024-01-15T10:32:00Z',
      },
    ]
    usePipelineStore.getState().setQuestions('pipe-1', questions)
    usePipelineStore.getState().removeQuestion('pipe-1', 'q-1')

    const remaining = usePipelineStore.getState().questions.get('pipe-1')
    expect(remaining).toHaveLength(1)
    expect(remaining?.[0]?.qid).toBe('q-2')
  })
})

// ---------------------------------------------------------------------------
// Test 11: clearPipelineEvents removes list
// ---------------------------------------------------------------------------
describe('clearPipelineEvents', () => {
  it('deletes the event list for a pipeline', () => {
    const event: PipelineEvent = { event: 'pipeline_started', name: 'my-pipeline', id: 'pipe-1' }
    usePipelineStore.getState().addEvent('pipe-1', event)
    expect(usePipelineStore.getState().events.has('pipe-1')).toBe(true)

    usePipelineStore.getState().clearPipelineEvents('pipe-1')
    expect(usePipelineStore.getState().events.has('pipe-1')).toBe(false)
  })
})
