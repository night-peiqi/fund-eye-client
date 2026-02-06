import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWatchlistStore } from '../watchlist'
import type { Fund, Valuation } from '@shared/types'

// 创建测试用的基金数据
function createTestFund(code: string, change: number = 0): Fund {
  return {
    code,
    name: `测试基金${code}`,
    netValue: 1.5,
    netValueDate: '2024-01-01',
    estimatedValue: 1.5,
    estimatedChange: change,
    updateTime: new Date().toISOString(),
    holdings: []
  }
}

describe('watchlist store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addFund', () => {
    it('should add a fund to empty list', () => {
      const store = useWatchlistStore()
      const fund = createTestFund('000001')

      const result = store.addFund(fund)

      expect(result).toBe(true)
      expect(store.funds).toHaveLength(1)
      expect(store.funds[0].code).toBe('000001')
    })

    it('should not add duplicate fund (Requirement 1.4)', () => {
      const store = useWatchlistStore()
      const fund1 = createTestFund('000001')
      const fund2 = createTestFund('000001')

      store.addFund(fund1)
      const result = store.addFund(fund2)

      expect(result).toBe(false)
      expect(store.funds).toHaveLength(1)
    })

    it('should add multiple different funds', () => {
      const store = useWatchlistStore()

      store.addFund(createTestFund('000001'))
      store.addFund(createTestFund('000002'))
      store.addFund(createTestFund('000003'))

      expect(store.funds).toHaveLength(3)
    })
  })

  describe('removeFund', () => {
    it('should remove existing fund (Requirement 3.5)', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001'))
      store.addFund(createTestFund('000002'))

      const result = store.removeFund('000001')

      expect(result).toBe(true)
      expect(store.funds).toHaveLength(1)
      expect(store.funds[0].code).toBe('000002')
    })

    it('should return false when removing non-existent fund', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001'))

      const result = store.removeFund('999999')

      expect(result).toBe(false)
      expect(store.funds).toHaveLength(1)
    })
  })

  describe('sortByChange', () => {
    it('should sort funds by change descending (Requirement 3.6)', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001', 1.5))
      store.addFund(createTestFund('000002', 3.2))
      store.addFund(createTestFund('000003', -0.5))

      store.sortByChange(false)

      expect(store.funds[0].code).toBe('000002')
      expect(store.funds[1].code).toBe('000001')
      expect(store.funds[2].code).toBe('000003')
    })

    it('should sort funds by change ascending', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001', 1.5))
      store.addFund(createTestFund('000002', 3.2))
      store.addFund(createTestFund('000003', -0.5))

      store.sortByChange(true)

      expect(store.funds[0].code).toBe('000003')
      expect(store.funds[1].code).toBe('000001')
      expect(store.funds[2].code).toBe('000002')
    })
  })

  describe('getters', () => {
    it('hasFund should return true for existing fund', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001'))

      expect(store.hasFund('000001')).toBe(true)
      expect(store.hasFund('999999')).toBe(false)
    })

    it('fundsSortedByChange should return sorted copy', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001', 1.0))
      store.addFund(createTestFund('000002', 2.0))

      const sorted = store.fundsSortedByChange

      expect(sorted[0].code).toBe('000002')
      expect(sorted[1].code).toBe('000001')
      // Original should be unchanged
      expect(store.funds[0].code).toBe('000001')
    })
  })

  describe('updateFundValuation', () => {
    it('should update fund valuation', () => {
      const store = useWatchlistStore()
      store.addFund(createTestFund('000001'))

      const valuation: Valuation = {
        estimatedValue: 1.55,
        estimatedChange: 3.33,
        updateTime: '2024-01-02T10:00:00Z',
        isComplete: true
      }

      const result = store.updateFundValuation('000001', valuation)

      expect(result).toBe(true)
      expect(store.funds[0].estimatedValue).toBe(1.55)
      expect(store.funds[0].estimatedChange).toBe(3.33)
    })

    it('should return false for non-existent fund', () => {
      const store = useWatchlistStore()

      const valuation: Valuation = {
        estimatedValue: 1.55,
        estimatedChange: 3.33,
        updateTime: '2024-01-02T10:00:00Z',
        isComplete: true
      }

      const result = store.updateFundValuation('999999', valuation)

      expect(result).toBe(false)
    })
  })
})
