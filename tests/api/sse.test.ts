import { describe, it, expect } from 'vitest'
import {
  createEventSourceUrl,
  parseSseEvent,
} from '../../src/api/sse'

// ---------------------------------------------------------------------------
// createEventSourceUrl
// ---------------------------------------------------------------------------

describe('createEventSourceUrl', () => {
  it('builds URL with default since=0', () => {
    expect(createEventSourceUrl('pipe-123')).toBe(
      '/api/pipelines/pipe-123/events?since=0',
    )
  })

  it('builds URL with custom since parameter', () => {
    expect(createEventSourceUrl('pipe-abc', 42)).toBe(
      '/api/pipelines/pipe-abc/events?since=42',
    )
  })
})

// ---------------------------------------------------------------------------
// parseSseEvent — valid event payloads
// ---------------------------------------------------------------------------

describe('parseSseEvent', () => {
  it('parses stage_started event', () => {
    const data = JSON.stringify({ event: 'stage_started', name: 'build', index: 0 })
    const result = parseSseEvent('stage_started', data)
    expect(result).toEqual({ event: 'stage_started', name: 'build', index: 0 })
  })

  it('parses pipeline_completed event', () => {
    const data = JSON.stringify({
      event: 'pipeline_completed',
      duration: { __duration_ms: 1500 },
      artifact_count: 3,
    })
    const result = parseSseEvent('pipeline_completed', data)
    expect(result).toEqual({
      event: 'pipeline_completed',
      duration: { __duration_ms: 1500 },
      artifact_count: 3,
    })
  })

  it('parses stage_completed event with duration', () => {
    const data = JSON.stringify({
      event: 'stage_completed',
      name: 'build',
      index: 0,
      duration: { __duration_ms: 500 },
    })
    const result = parseSseEvent('stage_completed', data)
    expect(result).toEqual({
      event: 'stage_completed',
      name: 'build',
      index: 0,
      duration: { __duration_ms: 500 },
    })
  })

  it('parses interview_started event', () => {
    const data = JSON.stringify({
      event: 'interview_started',
      question: 'Proceed?',
      stage: 'confirm',
    })
    const result = parseSseEvent('interview_started', data)
    expect(result).toEqual({
      event: 'interview_started',
      question: 'Proceed?',
      stage: 'confirm',
    })
  })

  it('returns null for invalid JSON', () => {
    expect(parseSseEvent('stage_started', '{not valid json}')).toBeNull()
  })

  it('returns null for empty data', () => {
    expect(parseSseEvent('stage_started', '')).toBeNull()
  })
})
