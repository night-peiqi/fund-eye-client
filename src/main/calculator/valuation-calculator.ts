import type { FundDetail, StockQuote, Valuation, Holding } from '@shared/types'

/**
 * 估值计算服务接口
 */
export interface IValuationService {
  calculateValuation(fund: FundDetail, quotes: StockQuote[]): Valuation
}

/**
 * 估值计算器
 * 根据基金持仓和股票实时行情计算基金估值
 */
export class ValuationCalculator implements IValuationService {
  /**
   * 计算基金估值
   * @param fund 基金详情（包含持仓信息）
   * @param quotes 股票实时行情列表
   * @returns 估值结果
   */
  calculateValuation(fund: FundDetail, quotes: StockQuote[]): Valuation {
    // 创建股票代码到行情的映射，便于快速查找
    const quoteMap = new Map<string, StockQuote>()
    for (const quote of quotes) {
      quoteMap.set(quote.code, quote)
    }

    // 计算加权涨跌幅
    const { estimatedChange, isComplete } = this.calculateWeightedChange(fund.holdings, quoteMap)

    // 计算估值净值
    const estimatedValue = this.calculateEstimatedValue(fund.netValue, estimatedChange)

    return {
      estimatedValue,
      estimatedChange,
      updateTime: new Date().toISOString(),
      isComplete
    }
  }

  /**
   * 计算加权涨跌幅
   * 公式：Σ(股票涨跌幅 × 持仓占比)
   * @param holdings 持仓列表
   * @param quoteMap 股票行情映射
   * @returns 加权涨跌幅和数据完整性标志
   */
  calculateWeightedChange(
    holdings: Holding[],
    quoteMap: Map<string, StockQuote>
  ): { estimatedChange: number; isComplete: boolean } {
    let totalChange = 0
    let matchedCount = 0

    for (const holding of holdings) {
      const quote = quoteMap.get(holding.stockCode)
      if (quote) {
        // 涨跌幅 × 持仓占比（占比已经是百分比形式，如 8.5 表示 8.5%）
        // 需要将占比转换为小数进行计算
        totalChange += quote.change * (holding.ratio / 100)
        matchedCount++
      }
    }

    return {
      estimatedChange: totalChange,
      isComplete: matchedCount === holdings.length && holdings.length > 0
    }
  }

  /**
   * 计算估值净值
   * 公式：昨日净值 × (1 + 估值涨跌幅)
   * @param netValue 昨日净值
   * @param estimatedChange 估值涨跌幅（百分比）
   * @returns 估值净值
   */
  calculateEstimatedValue(netValue: number, estimatedChange: number): number {
    // estimatedChange 是百分比形式，需要转换为小数
    return netValue * (1 + estimatedChange / 100)
  }
}

// 导出单例实例
export const valuationCalculator = new ValuationCalculator()
