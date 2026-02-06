import axios from 'axios'
import type { StockQuote } from '@shared/types'

/**
 * 股票行情服务接口
 */
export interface IStockService {
  getStockQuotes(codes: string[]): Promise<StockQuote[]>
}

/**
 * 东方财富网股票行情抓取服务
 * 实现批量获取股票实时行情功能
 */
export class StockFetcher implements IStockService {
  // 东方财富行情 API，获取个股信息
  private readonly quoteUrl = 'https://push2.eastmoney.com/api/qt/ulist.np/get'

  // HTTP 请求超时时间 (毫秒)
  private readonly timeout = 15000

  // 最大重试次数
  private readonly maxRetries = 2

  /**
   * 批量获取股票实时行情
   * @param codes 股票代码列表
   * @returns 股票行情列表
   */
  async getStockQuotes(codes: string[]): Promise<StockQuote[]> {
    if (codes.length === 0) {
      return []
    }

    // 转换股票代码为东方财富格式
    const secids = codes.map((code) => this.formatSecId(code)).join(',')

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(this.quoteUrl, {
          params: {
            fltt: 2,
            invt: 2,
            fields: 'f2,f3,f4,f12,f14',
            secids: secids,
            _: Date.now()
          },
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://quote.eastmoney.com/'
          }
        })

        return this.parseQuotes(response.data)
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries
        if (isLastAttempt) {
          console.error(
            `Failed to fetch stock quotes after ${this.maxRetries + 1} attempts:`,
            error instanceof Error ? error.message : error
          )
        } else {
          console.warn(`Stock quotes fetch attempt ${attempt + 1} failed, retrying...`)
          // 等待一小段时间再重试
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    return []
  }

  /**
   * 转换股票代码为东方财富 secid 格式
   * @param code 股票代码 (6位数字)
   * @returns secid 格式 (市场.代码)
   */
  private formatSecId(code: string): string {
    const cleanCode = code.replace(/[^\d]/g, '')

    if (cleanCode.startsWith('6')) {
      return `1.${cleanCode}` // 上海
    } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
      return `0.${cleanCode}` // 深圳
    } else if (cleanCode.startsWith('4') || cleanCode.startsWith('8')) {
      return `0.${cleanCode}` // 北交所
    }

    return `0.${cleanCode}`
  }

  /**
   * 解析行情数据
   * @param data API 返回数据
   * @returns 股票行情列表
   */
  private parseQuotes(data: QuoteResponse): StockQuote[] {
    const quotes: StockQuote[] = []

    try {
      if (!data.data || !data.data.diff) {
        return quotes
      }

      for (const item of data.data.diff) {
        quotes.push({
          code: item.f12 || '',
          name: item.f14 || '',
          price: typeof item.f2 === 'number' ? item.f2 : 0,
          change: typeof item.f3 === 'number' ? item.f3 : 0,
          changeAmount: typeof item.f4 === 'number' ? item.f4 : 0
        })
      }
    } catch (error) {
      console.error('Failed to parse quote data:', error)
    }

    return quotes
  }
}

/**
 * API 响应类型定义
 */
interface QuoteResponse {
  data?: {
    diff?: QuoteItem[]
  }
}

interface QuoteItem {
  f2?: number // 最新价
  f3?: number // 涨跌幅
  f4?: number // 涨跌额
  f12?: string // 代码
  f14?: string // 名称
}

// 导出单例
export const stockFetcher = new StockFetcher()
