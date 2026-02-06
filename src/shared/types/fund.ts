/**
 * 基金持仓信息
 */
export interface Holding {
  stockCode: string // 股票代码
  stockName: string // 股票名称
  ratio: number // 持仓占比 (百分比，如 8.5 表示 8.5%)
  change: number // 当日涨跌幅 (百分比)
  price: number // 当前价格
}

/**
 * 基金完整信息
 */
export interface Fund {
  code: string // 基金代码，如 "000001"
  name: string // 基金名称
  netValue: number // 最新净值
  netValueDate: string // 净值日期 (YYYY-MM-DD)
  estimatedValue: number // 估算净值
  estimatedChange: number // 估算涨跌幅 (百分比)
  updateTime: string // 估值更新时间 (ISO 字符串)
  holdings: Holding[] // 前十大持仓
  isRealValue?: boolean // 是否是真实净值（收盘后已更新）
}

/**
 * 基金基本信息（搜索结果）
 */
export interface FundBasicInfo {
  code: string // 基金代码
  name: string // 基金名称
  type: string // 基金类型
  netValue: number // 最新净值
  netValueDate: string // 净值日期
}

/**
 * 基金详情（包含持仓）
 */
export interface FundDetail extends FundBasicInfo {
  holdings: Holding[] // 前十大持仓
}

/**
 * 股票实时行情
 */
export interface StockQuote {
  code: string // 股票代码
  name: string // 股票名称
  price: number // 当前价格
  change: number // 涨跌幅 (百分比)
  changeAmount: number // 涨跌额
}

/**
 * 估值计算结果
 */
export interface Valuation {
  estimatedValue: number // 估算净值
  estimatedChange: number // 估算涨跌幅 (百分比)
  updateTime: string // 更新时间 (ISO 字符串)
  isComplete: boolean // 数据是否完整
}
