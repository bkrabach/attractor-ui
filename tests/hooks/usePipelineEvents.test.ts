import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Test 1: usePipelineEvents exports a function
// ---------------------------------------------------------------------------

describe('usePipelineEvents', () => {
  it('exports usePipelineEvents as a function', async () => {
    const module = await import('../../src/hooks/usePipelineEvents')
    expect(typeof module.usePipelineEvents).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Test 2: usePipelineStatus exports a function
// ---------------------------------------------------------------------------

describe('usePipelineStatus', () => {
  it('exports usePipelineStatus as a function', async () => {
    const module = await import('../../src/hooks/usePipelineStatus')
    expect(typeof module.usePipelineStatus).toBe('function')
  })
})
