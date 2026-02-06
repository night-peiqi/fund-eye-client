/**
 * 存储的持仓信息（不含实时数据）
 */
export interface StoredHolding {
  stockCode: string // 股票代码
  stockName: string // 股票名称
  ratio: number // 持仓占比 (百分比)
}

/**
 * 存储的基金信息
 */
export interface StoredFund {
  code: string // 基金代码
  name: string // 基金名称
  netValue: number // 最新净值
  netValueDate: string // 净值日期
  estimatedValue: number // 估算净值
  estimatedChange: number // 估算涨跌幅
  updateTime: string // 更新时间
  holdings: StoredHolding[]
  addedAt: string // 添加时间 (ISO 日期字符串)
  isRealValue?: boolean // 是否是真实净值
}

/**
 * electron-store 存储格式
 */
export interface StorageSchema {
  watchlist: {
    funds: StoredFund[]
    version: number
  }
  settings: {
    theme: 'light' | 'dark'
  }
}
