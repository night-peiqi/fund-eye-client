import { fundFetcher } from '../fetchers/fund-fetcher'
import { getStorageService } from './storage-service'
import { getIPCHandler } from './ipc-handler'
import type { Fund } from '@shared/types'

/**
 * 净值更新配置
 */
interface NetValueUpdaterConfig {
  /** 首次检查时间（小时），默认 20:00 */
  checkHour: number
  /** 重试间隔（毫秒），默认 5 分钟 */
  retryInterval: number
  /** 最大重试次数，默认 12 次（1 小时） */
  maxRetries: number
}

const DEFAULT_CONFIG: NetValueUpdaterConfig = {
  checkHour: 20,
  retryInterval: 5 * 60 * 1000, // 5 分钟
  maxRetries: 12
}

/**
 * 净值更新服务
 * 负责在收盘后获取基金真实净值并更新
 */
export class NetValueUpdater {
  private config: NetValueUpdaterConfig
  private checkTimer: NodeJS.Timeout | null = null
  private retryCount = 0
  private isUpdating = false

  constructor(config: Partial<NetValueUpdaterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启动净值更新服务
   */
  start(): void {
    console.log('Starting net value updater service')

    // 启动时检查是否需要更新
    this.checkAndUpdateIfNeeded()

    // 设置每日定时检查
    this.scheduleDailyCheck()
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = null
    }
  }

  /**
   * 检查并在需要时更新净值
   * 用于启动时检查和定时检查
   */
  async checkAndUpdateIfNeeded(): Promise<void> {
    const storage = getStorageService()
    const watchlist = storage.getWatchlist()

    if (watchlist.length === 0) {
      return
    }

    const today = this.getTodayDate()
    const now = new Date()
    const currentHour = now.getHours()

    // 检查是否是工作日且已过检查时间
    if (!this.isWeekday(now) || currentHour < this.config.checkHour) {
      return
    }

    // 检查是否有基金需要更新（净值日期不是今天）
    const needsUpdate = watchlist.some((fund) => fund.netValueDate !== today)

    if (needsUpdate) {
      console.log('Found funds needing net value update')
      await this.updateNetValues()
    }
  }

  /**
   * 更新所有基金的净值
   */
  private async updateNetValues(): Promise<void> {
    if (this.isUpdating) {
      return
    }

    this.isUpdating = true
    const storage = getStorageService()
    const watchlist = storage.getWatchlist()
    const today = this.getTodayDate()

    let allUpdated = true
    const updatedFunds: Fund[] = []

    for (const fund of watchlist) {
      // 跳过已经是今天净值的基金
      if (fund.netValueDate === today) {
        updatedFunds.push(fund)
        continue
      }

      const netValueInfo = await fundFetcher.getLatestNetValue(fund.code)

      if (netValueInfo && netValueInfo.netValueDate === today) {
        // 净值已更新到今天，使用接口返回的真实涨跌幅
        const updatedFund: Fund = {
          ...fund,
          netValue: netValueInfo.netValue,
          netValueDate: netValueInfo.netValueDate,
          estimatedValue: netValueInfo.netValue,
          estimatedChange: netValueInfo.change,
          updateTime: new Date().toISOString(),
          isRealValue: true
        }
        updatedFunds.push(updatedFund)
        console.log(
          `Updated net value for ${fund.code}: ${netValueInfo.netValue}, change: ${netValueInfo.change}%`
        )
      } else {
        // 净值还未更新
        updatedFunds.push(fund)
        allUpdated = false
        console.log(`Net value not yet available for ${fund.code}`)
      }
    }

    // 保存更新后的数据
    storage.saveWatchlist(updatedFunds)

    // 通知渲染进程
    const ipcHandler = getIPCHandler()
    ipcHandler.sendValuationUpdate(updatedFunds)

    this.isUpdating = false

    // 如果还有未更新的基金，安排重试
    if (!allUpdated && this.retryCount < this.config.maxRetries) {
      this.retryCount++
      console.log(
        `Scheduling retry ${this.retryCount}/${this.config.maxRetries} in ${this.config.retryInterval / 1000}s`
      )
      setTimeout(() => {
        this.updateNetValues()
      }, this.config.retryInterval)
    } else if (allUpdated) {
      console.log('All funds net values updated successfully')
      this.retryCount = 0
    } else {
      console.log('Max retries reached, some funds may not have updated net values')
      this.retryCount = 0
    }
  }

  /**
   * 设置每日定时检查
   */
  private scheduleDailyCheck(): void {
    const now = new Date()
    const checkTime = new Date(now)
    checkTime.setHours(this.config.checkHour, 0, 0, 0)

    // 如果今天的检查时间已过，设置明天的
    if (now >= checkTime) {
      checkTime.setDate(checkTime.getDate() + 1)
    }

    const delay = checkTime.getTime() - now.getTime()
    console.log(`Next net value check scheduled in ${Math.round(delay / 1000 / 60)} minutes`)

    this.checkTimer = setTimeout(() => {
      this.retryCount = 0
      this.updateNetValues()
      // 设置下一天的检查
      this.scheduleDailyCheck()
    }, delay)
  }

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * 判断是否是工作日（周一到周五）
   * 注意：不能判断节假日，只是基本过滤
   */
  private isWeekday(date: Date): boolean {
    const day = date.getDay()
    return day !== 0 && day !== 6
  }
}

// 单例实例
let updaterInstance: NetValueUpdater | null = null

/**
 * 获取净值更新服务单例
 */
export function getNetValueUpdater(): NetValueUpdater {
  if (!updaterInstance) {
    updaterInstance = new NetValueUpdater()
  }
  return updaterInstance
}

/**
 * 重置服务（用于测试）
 */
export function resetNetValueUpdater(): void {
  if (updaterInstance) {
    updaterInstance.stop()
    updaterInstance = null
  }
}
