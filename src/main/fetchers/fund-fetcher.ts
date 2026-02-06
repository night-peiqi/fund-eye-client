import axios from 'axios'
import type { FundBasicInfo, FundDetail, Holding } from '@shared/types'

/**
 * 搜索 API 响应类型
 */
interface SearchResponse {
  ErrCode: number
  Datas: Array<{
    CODE: string
    NAME: string
    CATEGORY: number
    FundBaseInfo?: {
      SHORTNAME?: string
      FTYPE?: string
      DWJZ?: number
      FSRQ?: string
    }
  }>
}

/**
 * 基金数据服务接口
 */
export interface IFundService {
  searchFund(code: string): Promise<FundBasicInfo | null>
  getFundDetail(code: string): Promise<FundDetail>
}

/**
 * 天天基金网数据抓取服务
 * 实现基金搜索和详情获取功能
 */
export class FundFetcher implements IFundService {
  private readonly searchUrl = 'https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx'

  // HTTP 请求超时时间 (毫秒)
  private readonly timeout = 10000

  /**
   * 获取基金实时估值数据
   * @param code 基金代码
   * @returns 估值信息
   */
  async getFundValuation(code: string): Promise<{
    netValue: number // 昨日净值
    netValueDate: string // 净值日期
    estimatedValue: number // 估算净值
    estimatedChange: number // 估算涨跌幅
    updateTime: string // 估值更新时间
    isRealValue: boolean // 是否是真实净值（jzrq 等于今天）
    isTradingDay: boolean // 今天是否是交易日（gztime 是今天）
  } | null> {
    try {
      // 添加时间戳防止缓存
      const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://fund.eastmoney.com/',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      })

      const match = response.data.match(/jsonpgz\((.+)\)/)
      if (match) {
        const data = JSON.parse(match[1])
        const today = new Date().toISOString().split('T')[0]
        const netValueDate = data.jzrq || ''
        const gztime = data.gztime || ''
        // 判断是否是真实净值：净值日期等于今天（收盘后更新了）
        const isRealValue = netValueDate === today
        // 判断今天是否是交易日：估值时间是今天
        const isTradingDay = gztime.startsWith(today)

        return {
          netValue: parseFloat(data.dwjz) || 0,
          netValueDate,
          estimatedValue: isRealValue ? parseFloat(data.dwjz) || 0 : parseFloat(data.gsz) || 0,
          estimatedChange: parseFloat(data.gszzl) || 0,
          updateTime: gztime || new Date().toISOString(),
          isRealValue,
          isTradingDay
        }
      }
      return null
    } catch (error) {
      console.error(`Failed to get fund valuation for ${code}:`, error)
      return null
    }
  }

  /**
   * 获取基金最新净值（用于收盘后更新）
   * 使用历史净值接口，数据更准确
   * @param code 基金代码
   * @returns 净值信息
   */
  async getLatestNetValue(code: string): Promise<{
    netValue: number
    netValueDate: string
    change: number
  } | null> {
    try {
      // 使用历史净值接口获取最新数据
      const url = `https://fund.eastmoney.com/f10/F10DataApi.aspx`
      const response = await axios.get(url, {
        params: {
          type: 'lsjz',
          code: code,
          page: 1,
          per: 1
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: `https://fund.eastmoney.com/f10/jjjz_${code}.html`
        }
      })

      // 解析返回的 HTML 表格
      // 格式: <td>2026-02-04</td><td>1.2345</td><td>1.2345</td><td>0.50%</td>
      const dateMatch = response.data.match(/<td>(\d{4}-\d{2}-\d{2})<\/td>/)
      const valueMatch = response.data.match(/<td>(\d{4}-\d{2}-\d{2})<\/td><td[^>]*>([^<]+)<\/td>/)
      const changeMatch = response.data.match(/<td[^>]*>(-?\d+\.?\d*)%<\/td>/)

      if (dateMatch && valueMatch) {
        return {
          netValue: parseFloat(valueMatch[2]) || 0,
          netValueDate: dateMatch[1],
          change: changeMatch ? parseFloat(changeMatch[1]) : 0
        }
      }
      return null
    } catch (error) {
      console.error(`Failed to get latest net value for ${code}:`, error)
      return null
    }
  }

  /**
   * 根据基金代码搜索基金信息
   * @param code 基金代码
   * @returns 基金基本信息，未找到返回 null
   */
  async searchFund(code: string): Promise<FundBasicInfo | null> {
    try {
      // 使用天天基金搜索 API
      const response = await axios.get(this.searchUrl, {
        params: {
          callback: '',
          m: 1,
          key: code
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://fund.eastmoney.com/'
        }
      })

      const fundInfo = this.parseSearchResult(response.data, code)
      if (!fundInfo) {
        return null
      }

      // 获取净值信息
      const netValueInfo = await this.fetchNetValue(code)

      return {
        ...fundInfo,
        netValue: netValueInfo.netValue,
        netValueDate: netValueInfo.netValueDate
      }
    } catch (error) {
      console.error(`Failed to search fund ${code}:`, error)
      return null
    }
  }

  /**
   * 获取基金详情（包含前十大持仓）
   * @param code 基金代码
   * @returns 基金详情
   */
  async getFundDetail(code: string): Promise<FundDetail> {
    const basicInfo = await this.searchFund(code)
    if (!basicInfo) {
      throw new Error(`未找到基金: ${code}`)
    }

    const holdings = await this.fetchHoldings(code)

    return {
      ...basicInfo,
      holdings
    }
  }

  /**
   * 解析搜索结果
   * @param data API 返回数据
   * @param targetCode 目标基金代码
   * @returns 基金基本信息
   */
  private parseSearchResult(
    data: SearchResponse | string,
    targetCode: string
  ): Omit<FundBasicInfo, 'netValue' | 'netValueDate'> | null {
    try {
      let result: SearchResponse

      // 处理可能的 JSONP 或 JSON 格式
      if (typeof data === 'string') {
        const jsonStr = data.replace(/^[^{]*/, '').replace(/[^}]*$/, '')
        result = JSON.parse(jsonStr)
      } else {
        result = data
      }

      if (!result.Datas || result.Datas.length === 0) {
        return null
      }

      // 查找精确匹配的基金（CATEGORY 700 表示基金）
      const fund = result.Datas.find((item) => item.CODE === targetCode && item.CATEGORY === 700)
      if (!fund) {
        return null
      }

      return {
        code: fund.CODE,
        name: fund.NAME || fund.FundBaseInfo?.SHORTNAME || '',
        type: fund.FundBaseInfo?.FTYPE || '混合型'
      }
    } catch (error) {
      console.error('Failed to parse search result:', error)
      return null
    }
  }

  /**
   * 获取基金净值信息
   * @param code 基金代码
   * @returns 净值和日期
   */
  private async fetchNetValue(code: string): Promise<{ netValue: number; netValueDate: string }> {
    try {
      // 使用基金详情页 API 获取净值
      const url = `https://fundgz.1234567.com.cn/js/${code}.js`
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://fund.eastmoney.com/'
        }
      })

      // 解析 JSONP 格式: jsonpgz({"fundcode":"000001",...})
      const match = response.data.match(/jsonpgz\((.+)\)/)
      if (match) {
        const data = JSON.parse(match[1])
        return {
          netValue: parseFloat(data.dwjz) || 0,
          netValueDate: data.jzrq || new Date().toISOString().split('T')[0]
        }
      }

      return { netValue: 0, netValueDate: new Date().toISOString().split('T')[0] }
    } catch (error) {
      console.error(`Failed to fetch net value for fund ${code}:`, error)
      return { netValue: 0, netValueDate: new Date().toISOString().split('T')[0] }
    }
  }

  /**
   * 获取基金前十大持仓
   * @param code 基金代码
   * @returns 持仓列表
   */
  private async fetchHoldings(code: string): Promise<Holding[]> {
    try {
      // 使用基金持仓 API
      const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx`
      const response = await axios.get(url, {
        params: {
          type: 'jjcc',
          code: code,
          topline: 10,
          year: '',
          month: '',
          rt: Date.now()
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: `https://fundf10.eastmoney.com/ccmx_${code}.html`
        }
      })

      return this.parseHoldings(response.data)
    } catch (error) {
      console.error(`Failed to fetch holdings for fund ${code}:`, error)
      return []
    }
  }

  /**
   * 解析持仓数据
   * @param html HTML 内容
   * @returns 持仓列表
   */
  private parseHoldings(html: string): Holding[] {
    const holdings: Holding[] = []

    try {
      // 匹配第一个季度的表格（最新数据）
      const tableMatch = html.match(/<table class='w782 comm tzxq'>([\s\S]*?)<\/table>/)
      if (!tableMatch) {
        return []
      }

      const tableContent = tableMatch[1]

      // 匹配所有数据行 (tbody 中的 tr)
      const rowRegex =
        /<tr><td>\d+<\/td><td><a[^>]*>(\d+)<\/a><\/td><td class='tol'><a[^>]*>([^<]+)<\/a><\/td>[\s\S]*?<td class='tor'>([\d.]+)%<\/td>/g
      let match

      while ((match = rowRegex.exec(tableContent)) !== null) {
        holdings.push({
          stockCode: match[1],
          stockName: match[2].trim(),
          ratio: parseFloat(match[3]) || 0,
          change: 0,
          price: 0
        })

        if (holdings.length >= 10) break
      }
    } catch (error) {
      console.error('Failed to parse holdings data:', error)
    }

    return holdings
  }
}

// 导出单例
export const fundFetcher = new FundFetcher()
