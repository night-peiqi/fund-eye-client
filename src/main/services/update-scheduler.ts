import { getIPCHandler } from './ipc-handler'

/**
 * 更新调度器配置
 */
export interface SchedulerConfig {
  /** 更新间隔（毫秒），默认 60000ms */
  updateInterval: number
  /** 最大重试次数 */
  maxRetries: number
  /** 重试延迟（毫秒） */
  retryDelay: number
}

const DEFAULT_CONFIG: SchedulerConfig = {
  updateInterval: 60000, // 60秒，与天天基金网更新频率保持一致
  maxRetries: 3,
  retryDelay: 2000
}

/**
 * 调度器状态
 */
export interface SchedulerStatus {
  isRunning: boolean
  lastUpdateTime: string | null
  lastError: string | null
  consecutiveErrors: number
}

/**
 * 更新调度器
 * 负责定时更新所有自选基金的估值
 *
 * Requirements:
 * - 2.1: 每60秒根据持仓股票实时价格计算所有自选基金的估值
 * - 2.6: 用户手动触发刷新时立即重新计算最新估值数据
 */
export class UpdateScheduler {
  private config: SchedulerConfig
  private intervalId: NodeJS.Timeout | null = null
  private status: SchedulerStatus = {
    isRunning: false,
    lastUpdateTime: null,
    lastError: null,
    consecutiveErrors: 0
  }

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启动调度器
   * Requirement 2.1: 每60秒自动更新估值
   */
  start(): void {
    if (this.status.isRunning) {
      console.log('Scheduler is already running')
      return
    }

    console.log(`Starting valuation update scheduler, interval: ${this.config.updateInterval}ms`)
    this.status.isRunning = true

    // 立即执行一次更新
    this.executeUpdate()

    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.executeUpdate()
    }, this.config.updateInterval)
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.status.isRunning) {
      return
    }

    console.log('Stopping valuation update scheduler')

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.status.isRunning = false
  }

  /**
   * 手动触发刷新
   * Requirement 2.6: 用户手动触发刷新时立即重新计算
   */
  async refresh(): Promise<void> {
    console.log('Manual valuation refresh triggered')
    await this.executeUpdate(true)
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    return { ...this.status }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    const wasRunning = this.status.isRunning

    if (wasRunning) {
      this.stop()
    }

    this.config = { ...this.config, ...config }

    if (wasRunning) {
      this.start()
    }
  }

  /**
   * 执行估值更新
   * @param force 是否强制执行（忽略交易时间检查）
   */
  private async executeUpdate(force = false): Promise<void> {
    // 非交易时间跳过执行
    if (!force && !this.isMarketOpen()) {
      return
    }

    const ipcHandler = getIPCHandler()

    try {
      const updatedFunds = await ipcHandler.updateAllValuations()

      // 更新成功，重置错误计数
      this.status.lastUpdateTime = new Date().toISOString()
      this.status.lastError = null
      this.status.consecutiveErrors = 0

      // 通知渲染进程
      ipcHandler.sendValuationUpdate(updatedFunds)

      console.log(`Valuation update successful, updated ${updatedFunds.length} funds`)
    } catch (error) {
      this.handleUpdateError(error)
    }
  }

  /**
   * 处理更新错误
   */
  private handleUpdateError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    this.status.lastError = errorMessage
    this.status.consecutiveErrors++

    console.error(
      `Valuation update failed (${this.status.consecutiveErrors}/${this.config.maxRetries}):`,
      errorMessage
    )

    const ipcHandler = getIPCHandler()

    // 如果连续错误次数未超过最大重试次数，安排重试
    if (this.status.consecutiveErrors < this.config.maxRetries) {
      console.log(`Will retry in ${this.config.retryDelay}ms`)
      setTimeout(() => {
        this.executeUpdate()
      }, this.config.retryDelay)
    } else {
      // 超过最大重试次数，通知渲染进程
      ipcHandler.sendError(`网络连接异常，请检查网络后重试 (${errorMessage})`)
    }
  }

  /**
   * 检查是否在交易时间内
   * 交易时间: 周一至周五 9:30-11:30, 13:00-15:00（不含节假日）
   * 注意：节假日无法准确判断，但不影响功能，只是会有无效请求
   */
  isMarketOpen(): boolean {
    const now = new Date()
    const day = now.getDay()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const time = hours * 60 + minutes

    // 周末不开市
    if (day === 0 || day === 6) {
      return false
    }

    // 上午交易时间: 9:30 - 11:30
    const morningStart = 9 * 60 + 30
    const morningEnd = 11 * 60 + 30

    // 下午交易时间: 13:00 - 15:00
    const afternoonStart = 13 * 60
    const afternoonEnd = 15 * 60

    return (
      (time >= morningStart && time <= morningEnd) ||
      (time >= afternoonStart && time <= afternoonEnd)
    )
  }

  /**
   * 智能调度 - 只在交易时间内执行更新
   */
  startSmart(): void {
    if (this.status.isRunning) {
      console.log('Scheduler is already running')
      return
    }

    console.log('Starting smart valuation update scheduler')
    this.status.isRunning = true

    // 立即执行一次
    this.executeUpdate()

    // 定时执行
    this.intervalId = setInterval(() => {
      this.executeUpdate()
    }, this.config.updateInterval)
  }
}

// 单例实例
let schedulerInstance: UpdateScheduler | null = null

/**
 * 获取调度器单例
 */
export function getUpdateScheduler(): UpdateScheduler {
  if (!schedulerInstance) {
    // 直接使用代码配置，不从存储读取
    schedulerInstance = new UpdateScheduler()
  }
  return schedulerInstance
}

/**
 * 重置调度器（用于测试）
 */
export function resetUpdateScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop()
    schedulerInstance = null
  }
}
