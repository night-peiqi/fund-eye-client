import { defineStore } from 'pinia'
import type { Fund, WatchlistState, Valuation } from '@shared/types'

/**
 * 自选列表 Store
 *
 * Requirements:
 * - 1.3: 用户确认添加基金时，将该基金添加到自选列表
 * - 1.4: 用户尝试添加已存在于自选列表的基金时，提示用户该基金已在自选列表中
 * - 3.5: 用户选择删除基金时，从自选列表中移除该基金
 * - 3.6: 支持按涨跌幅排序自选列表
 */
export const useWatchlistStore = defineStore('watchlist', {
  state: (): WatchlistState => ({
    funds: [],
    loading: false,
    error: null,
    lastUpdateTime: null
  }),

  getters: {
    /**
     * 获取基金数量
     */
    fundCount: (state): number => state.funds.length,

    /**
     * 检查基金是否已存在
     */
    hasFund:
      (state) =>
      (code: string): boolean =>
        state.funds.some((f) => f.code === code),

    /**
     * 根据代码获取基金
     */
    getFundByCode:
      (state) =>
      (code: string): Fund | undefined =>
        state.funds.find((f) => f.code === code),

    /**
     * 按涨跌幅降序排序的基金列表
     * Requirement 3.6: 支持按涨跌幅排序自选列表
     */
    fundsSortedByChange: (state): Fund[] =>
      [...state.funds].sort((a, b) => b.estimatedChange - a.estimatedChange)
  },

  actions: {
    /**
     * 添加基金到自选列表
     * Requirement 1.3: 用户确认添加基金时，将该基金添加到自选列表
     * Requirement 1.4: 用户尝试添加已存在于自选列表的基金时，提示用户该基金已在自选列表中
     *
     * @param fund 要添加的基金
     * @returns true 如果添加成功，false 如果基金已存在
     */
    addFund(fund: Fund): boolean {
      // 去重检查 - Requirement 1.4
      if (this.funds.some((f) => f.code === fund.code)) {
        return false
      }

      this.funds.push(fund)
      this.lastUpdateTime = new Date().toISOString()
      return true
    },

    /**
     * 从自选列表中删除基金
     * Requirement 3.5: 用户选择删除基金时，从自选列表中移除该基金
     *
     * @param code 要删除的基金代码
     * @returns true 如果删除成功，false 如果基金不存在
     */
    removeFund(code: string): boolean {
      const index = this.funds.findIndex((f) => f.code === code)
      if (index === -1) {
        return false
      }

      this.funds.splice(index, 1)
      this.lastUpdateTime = new Date().toISOString()
      return true
    },

    /**
     * 更新基金估值数据
     *
     * @param code 基金代码
     * @param valuation 新的估值数据
     * @returns true 如果更新成功，false 如果基金不存在
     */
    updateFundValuation(code: string, valuation: Valuation): boolean {
      const fund = this.funds.find((f) => f.code === code)
      if (!fund) {
        return false
      }

      fund.estimatedValue = valuation.estimatedValue
      fund.estimatedChange = valuation.estimatedChange
      fund.updateTime = valuation.updateTime
      this.lastUpdateTime = valuation.updateTime
      return true
    },

    /**
     * 批量更新所有基金的估值
     *
     * @param valuations 基金代码到估值的映射
     */
    updateAllValuations(valuations: Map<string, Valuation>): void {
      for (const fund of this.funds) {
        const valuation = valuations.get(fund.code)
        if (valuation) {
          fund.estimatedValue = valuation.estimatedValue
          fund.estimatedChange = valuation.estimatedChange
          fund.updateTime = valuation.updateTime
        }
      }
      this.lastUpdateTime = new Date().toISOString()
    },

    /**
     * 设置完整的基金列表（用于从存储加载）
     *
     * @param funds 基金列表
     */
    setFunds(funds: Fund[]): void {
      this.funds = funds
      // 取所有基金中最新的 updateTime 作为 lastUpdateTime
      const latestTime = funds.reduce((latest, fund) => {
        if (fund.updateTime && fund.updateTime > latest) {
          return fund.updateTime
        }
        return latest
      }, '')
      this.lastUpdateTime = latestTime || null
    },

    /**
     * 按涨跌幅排序（原地排序）
     * Requirement 3.6: 支持按涨跌幅排序自选列表
     *
     * @param ascending 是否升序，默认为 false（降序）
     */
    sortByChange(ascending: boolean = false): void {
      if (ascending) {
        this.funds.sort((a, b) => a.estimatedChange - b.estimatedChange)
      } else {
        this.funds.sort((a, b) => b.estimatedChange - a.estimatedChange)
      }
    },

    /**
     * 设置加载状态
     */
    setLoading(loading: boolean): void {
      this.loading = loading
    },

    /**
     * 设置错误信息
     */
    setError(error: string | null): void {
      this.error = error
    },

    /**
     * 清空自选列表
     */
    clearAll(): void {
      this.funds = []
      this.error = null
      this.lastUpdateTime = new Date().toISOString()
    }
  }
})
