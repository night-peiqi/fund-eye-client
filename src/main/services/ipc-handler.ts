import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { Fund, FundDetail, StockQuote } from '@shared/types'
import { fundFetcher } from '../fetchers/fund-fetcher'
import { stockFetcher } from '../fetchers/stock-fetcher'
import { valuationCalculator } from '../calculator/valuation-calculator'
import { getStorageService } from './storage-service'

/** 最大并发请求数 */
const MAX_CONCURRENT_REQUESTS = 5

/**
 * 并发控制的批量执行
 * @param items 要处理的项目
 * @param fn 处理函数
 * @param concurrency 并发数
 */
async function batchExecute<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = MAX_CONCURRENT_REQUESTS
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }

  return results
}

/**
 * IPC 处理结果类型
 */
export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * IPC 处理器类
 * 负责注册和处理所有 IPC 通信
 *
 * Requirements:
 * - 1.1: 用户输入基金代码并提交搜索
 * - 1.2: 搜索返回有效基金结果时显示信息
 * - 1.3: 用户确认添加基金到自选列表
 */
export class IPCHandler {
  private mainWindow: BrowserWindow | null = null

  /**
   * 初始化 IPC 处理器
   * @param mainWindow 主窗口实例
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
    this.registerHandlers()
  }

  /**
   * 注册所有 IPC 处理器
   */
  private registerHandlers(): void {
    // 基金搜索
    ipcMain.handle(
      IPC_CHANNELS.FUND_SEARCH,
      async (_event, code: string): Promise<IPCResult<FundDetail>> => {
        return this.handleFundSearch(code)
      }
    )

    // 基金添加
    ipcMain.handle(
      IPC_CHANNELS.FUND_ADD,
      async (_event, code: string): Promise<IPCResult<Fund>> => {
        return this.handleFundAdd(code)
      }
    )

    // 基金删除
    ipcMain.handle(
      IPC_CHANNELS.FUND_REMOVE,
      async (_event, code: string): Promise<IPCResult<void>> => {
        return this.handleFundRemove(code)
      }
    )

    // 手动刷新估值
    ipcMain.handle(IPC_CHANNELS.VALUATION_REFRESH, async (): Promise<IPCResult<Fund[]>> => {
      return this.handleValuationRefresh()
    })

    // 获取自选列表
    ipcMain.handle(IPC_CHANNELS.WATCHLIST_GET, async (): Promise<IPCResult<Fund[]>> => {
      return this.handleWatchlistGet()
    })

    // 保存自选列表
    ipcMain.handle(
      IPC_CHANNELS.WATCHLIST_SAVE,
      async (_event, funds: Fund[]): Promise<IPCResult<void>> => {
        return this.handleWatchlistSave(funds)
      }
    )

    // 清空自选列表
    ipcMain.handle(IPC_CHANNELS.WATCHLIST_CLEAR, async (): Promise<IPCResult<void>> => {
      return this.handleWatchlistClear()
    })
  }

  /**
   * 处理基金搜索
   * Requirement 1.1: 从天天基金网查询匹配的基金信息
   */
  private async handleFundSearch(code: string): Promise<IPCResult<FundDetail>> {
    try {
      const fundDetail = await fundFetcher.getFundDetail(code)
      return { success: true, data: fundDetail }
    } catch (error) {
      const message = error instanceof Error ? error.message : '搜索基金失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理基金添加
   * Requirement 1.3: 将基金添加到自选列表并持久化存储
   */
  private async handleFundAdd(code: string): Promise<IPCResult<Fund>> {
    try {
      const storage = getStorageService()
      const watchlist = storage.getWatchlist()

      // 检查是否已存在
      if (watchlist.some((f) => f.code === code)) {
        return { success: false, error: '该基金已在自选列表中' }
      }

      // 获取基金详情
      const fundDetail = await fundFetcher.getFundDetail(code)

      // 优先获取天天基金网的估值数据
      const fundValuation = await fundFetcher.getFundValuation(code)

      // 获取股票行情用于更新持仓数据
      const stockCodes = fundDetail.holdings.map((h) => h.stockCode)
      const quotes = await stockFetcher.getStockQuotes(stockCodes)

      // 更新持仓的实时数据
      const quoteMap = new Map(quotes.map((q) => [q.code, q]))
      const updatedHoldings = fundDetail.holdings.map((h) => {
        const quote = quoteMap.get(h.stockCode)
        return {
          ...h,
          change: quote?.change ?? 0,
          price: quote?.price ?? 0
        }
      })

      // 创建完整的基金对象
      let fund: Fund

      if (fundValuation) {
        // 使用天天基金网的估值数据
        fund = {
          code: fundDetail.code,
          name: fundDetail.name,
          netValue: fundValuation.netValue,
          netValueDate: fundValuation.netValueDate,
          estimatedValue: fundValuation.estimatedValue,
          estimatedChange: fundValuation.estimatedChange,
          updateTime: fundValuation.updateTime,
          isRealValue: fundValuation.isRealValue,
          holdings: updatedHoldings
        }
      } else {
        // 降级：使用持仓股票计算估值
        const valuation = valuationCalculator.calculateValuation(fundDetail, quotes)
        fund = {
          code: fundDetail.code,
          name: fundDetail.name,
          netValue: fundDetail.netValue,
          netValueDate: fundDetail.netValueDate,
          estimatedValue: valuation.estimatedValue,
          estimatedChange: valuation.estimatedChange,
          updateTime: valuation.updateTime,
          holdings: updatedHoldings
        }
      }

      // 保存到自选列表
      watchlist.push(fund)
      storage.saveWatchlist(watchlist)

      return { success: true, data: fund }
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加基金失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理基金删除
   * Requirement 3.5: 从自选列表中移除基金并更新持久化存储
   */
  private async handleFundRemove(code: string): Promise<IPCResult<void>> {
    try {
      const storage = getStorageService()
      const watchlist = storage.getWatchlist()

      const index = watchlist.findIndex((f) => f.code === code)
      if (index === -1) {
        return { success: false, error: '该基金不在自选列表中' }
      }

      watchlist.splice(index, 1)
      storage.saveWatchlist(watchlist)

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除基金失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理估值刷新
   * Requirement 2.6: 用户手动触发刷新时立即重新计算最新估值数据
   */
  async handleValuationRefresh(): Promise<IPCResult<Fund[]>> {
    try {
      const updatedFunds = await this.updateAllValuations()
      return { success: true, data: updatedFunds }
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新估值失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理获取自选列表
   * Requirement 4.2: 从本地存储加载之前保存的自选列表
   */
  private async handleWatchlistGet(): Promise<IPCResult<Fund[]>> {
    try {
      const storage = getStorageService()
      const watchlist = storage.getWatchlist()
      return { success: true, data: watchlist }
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取自选列表失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理保存自选列表
   * Requirement 4.1: 立即将变更保存到本地存储
   */
  private async handleWatchlistSave(funds: Fund[]): Promise<IPCResult<void>> {
    try {
      const storage = getStorageService()
      storage.saveWatchlist(funds)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存自选列表失败'
      return { success: false, error: message }
    }
  }

  /**
   * 处理清空自选列表
   */
  private async handleWatchlistClear(): Promise<IPCResult<void>> {
    try {
      const storage = getStorageService()
      storage.saveWatchlist([])
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : '清空自选列表失败'
      return { success: false, error: message }
    }
  }

  /**
   * 更新所有基金的估值
   * 用于定时更新和手动刷新
   * 优先使用天天基金网的估值，同时更新持仓股票的实时数据
   */
  async updateAllValuations(): Promise<Fund[]> {
    const storage = getStorageService()
    const watchlist = storage.getWatchlist()

    if (watchlist.length === 0) {
      return []
    }

    // 使用并发控制获取基金估值（每批最多 5 个请求）
    const valuations = await batchExecute(watchlist, (fund) =>
      fundFetcher.getFundValuation(fund.code)
    )

    // 判断是否是交易日（取第一个有效结果）
    const isTradingDay = valuations.some((v) => v?.isTradingDay)
    if (!isTradingDay) {
      console.log('Not a trading day, skip update')
      return watchlist
    }

    // 收集所有股票代码，用于更新持仓实时数据
    const allStockCodes = new Set<string>()
    for (const fund of watchlist) {
      for (const holding of fund.holdings) {
        allStockCodes.add(holding.stockCode)
      }
    }

    // 批量获取股票行情（可能失败，失败时返回空数组）
    const quotes = await stockFetcher.getStockQuotes(Array.from(allStockCodes))
    const quoteMap = new Map(quotes.map((q) => [q.code, q]))
    const hasStockQuotes = quotes.length > 0

    // 更新每个基金
    const updatedFunds = watchlist.map((fund, index) => {
      const fundValuation = valuations[index]

      // 更新持仓的实时数据（如果有股票行情的话）
      const updatedHoldings = hasStockQuotes
        ? fund.holdings.map((h) => {
            const quote = quoteMap.get(h.stockCode)
            return {
              ...h,
              change: quote?.change ?? h.change,
              price: quote?.price ?? h.price
            }
          })
        : fund.holdings

      // 如果天天基金网估值获取成功，使用它的数据
      if (fundValuation) {
        return {
          ...fund,
          netValue: fundValuation.isRealValue ? fundValuation.netValue : fund.netValue,
          netValueDate: fundValuation.isRealValue ? fundValuation.netValueDate : fund.netValueDate,
          estimatedValue: fundValuation.estimatedValue,
          estimatedChange: fundValuation.estimatedChange,
          updateTime: fundValuation.updateTime,
          isRealValue: fundValuation.isRealValue,
          holdings: updatedHoldings
        }
      }

      // 降级：使用持仓股票计算估值（仅当有股票行情时）
      if (hasStockQuotes) {
        const fundQuotes = fund.holdings
          .map((h) => quoteMap.get(h.stockCode))
          .filter((q): q is StockQuote => q !== undefined)

        const calculatedValuation = valuationCalculator.calculateValuation(
          {
            code: fund.code,
            name: fund.name,
            type: '',
            netValue: fund.netValue,
            netValueDate: fund.netValueDate,
            holdings: fund.holdings
          },
          fundQuotes
        )

        return {
          ...fund,
          estimatedValue: calculatedValuation.estimatedValue,
          estimatedChange: calculatedValuation.estimatedChange,
          updateTime: calculatedValuation.updateTime,
          isRealValue: false,
          holdings: updatedHoldings
        }
      }

      // 都失败了，保持原数据不变
      return fund
    })

    // 保存更新后的数据
    storage.saveWatchlist(updatedFunds)

    return updatedFunds
  }

  /**
   * 向渲染进程发送估值更新
   */
  sendValuationUpdate(funds: Fund[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.VALUATION_UPDATE, {
        success: true,
        data: funds
      })
    }
  }

  /**
   * 向渲染进程发送错误通知
   */
  sendError(error: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.VALUATION_UPDATE, {
        success: false,
        error
      })
    }
  }

  /**
   * 清理 IPC 处理器
   */
  cleanup(): void {
    ipcMain.removeHandler(IPC_CHANNELS.FUND_SEARCH)
    ipcMain.removeHandler(IPC_CHANNELS.FUND_ADD)
    ipcMain.removeHandler(IPC_CHANNELS.FUND_REMOVE)
    ipcMain.removeHandler(IPC_CHANNELS.VALUATION_REFRESH)
    ipcMain.removeHandler(IPC_CHANNELS.WATCHLIST_GET)
    ipcMain.removeHandler(IPC_CHANNELS.WATCHLIST_SAVE)
    ipcMain.removeHandler(IPC_CHANNELS.WATCHLIST_CLEAR)
    this.mainWindow = null
  }
}

// 单例实例
let ipcHandlerInstance: IPCHandler | null = null

/**
 * 获取 IPC 处理器单例
 */
export function getIPCHandler(): IPCHandler {
  if (!ipcHandlerInstance) {
    ipcHandlerInstance = new IPCHandler()
  }
  return ipcHandlerInstance
}

/**
 * 重置 IPC 处理器（用于测试）
 */
export function resetIPCHandler(): void {
  if (ipcHandlerInstance) {
    ipcHandlerInstance.cleanup()
    ipcHandlerInstance = null
  }
}
