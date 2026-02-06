import { describe, it, expect } from 'vitest'

describe('Test Environment Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support TypeScript', () => {
    const add = (a: number, b: number): number => a + b
    expect(add(2, 3)).toBe(5)
  })
})
