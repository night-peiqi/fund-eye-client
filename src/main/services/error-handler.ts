/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  PARSE = 'parse',
  STORAGE = 'storage',
  NOT_FOUND = 'notFound',
  UNKNOWN = 'unknown'
}

/**
 * 错误状态接口
 * 用于跟踪和管理错误状态
 */
export interface ErrorState {
  type: ErrorType
  message: string
  retryable: boolean
  timestamp: string
  retryCount: number
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
}

/**
 * 应用错误类
 * 用于统一错误处理
 */
export class AppError extends Error {
  readonly type: ErrorType
  readonly retryable: boolean
  readonly originalError?: Error

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.retryable = retryable
    this.originalError = originalError
  }

  toErrorState(): ErrorState {
    return {
      type: this.type,
      message: this.message,
      retryable: this.retryable,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, ErrorType.NETWORK, true, originalError)
    this.name = 'NetworkError'
  }
}

/**
 * 解析错误
 */
export class ParseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, ErrorType.PARSE, false, originalError)
    this.name = 'ParseError'
  }
}

/**
 * 存储错误
 */
export class StorageError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, ErrorType.STORAGE, true, originalError)
    this.name = 'StorageError'
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.NOT_FOUND, false)
    this.name = 'NotFoundError'
  }
}

/**
 * 错误处理器
 * 提供统一的错误处理和重试机制
 *
 * Requirements:
 * - 2.5: 网络连接中断或股票数据获取失败时显示连接状态提示并在恢复后自动重试
 * - 6.7: 数据源返回异常响应时使用缓存数据并标记数据为"待更新"状态
 */
export class ErrorHandler {
  private config: RetryConfig
  private errorHistory: ErrorState[] = []
  private readonly maxHistorySize = 100

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * 包装异步函数，添加重试逻辑
   * Requirement 2.5: 网络错误时自动重试
   */
  async withRetry<T>(fn: () => Promise<T>, context: string = 'operation'): Promise<T> {
    let lastError: Error | null = null
    let retryCount = 0

    while (retryCount <= this.config.maxRetries) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        const appError = this.normalizeError(lastError)

        // 如果错误不可重试，直接抛出
        if (!appError.retryable) {
          this.recordError(appError, retryCount)
          throw appError
        }

        retryCount++

        // 如果已达到最大重试次数，抛出错误
        if (retryCount > this.config.maxRetries) {
          this.recordError(appError, retryCount - 1)
          throw new AppError(
            `${context} 失败，已重试 ${this.config.maxRetries} 次: ${appError.message}`,
            appError.type,
            false,
            lastError
          )
        }

        // 计算延迟时间（指数退避）
        const delay = this.calculateDelay(retryCount)
        console.log(
          `${context} failed, retrying (${retryCount}) in ${delay}ms: ${appError.message}`
        )

        await this.sleep(delay)
      }
    }

    // 这行代码理论上不会执行，但 TypeScript 需要它
    throw lastError
  }

  /**
   * 标准化错误
   * 将各种错误转换为 AppError
   */
  normalizeError(error: Error): AppError {
    if (error instanceof AppError) {
      return error
    }

    const message = error.message.toLowerCase()

    // 网络相关错误
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('socket') ||
      message.includes('fetch')
    ) {
      return new NetworkError(this.getNetworkErrorMessage(error), error)
    }

    // 解析相关错误
    if (message.includes('parse') || message.includes('json') || message.includes('syntax')) {
      return new ParseError('数据解析失败', error)
    }

    // 存储相关错误
    if (message.includes('storage') || message.includes('file') || message.includes('permission')) {
      return new StorageError('存储操作失败', error)
    }

    // 未找到相关错误
    if (message.includes('not found') || message.includes('未找到')) {
      return new NotFoundError(error.message)
    }

    // 默认为未知错误
    return new AppError(error.message, ErrorType.UNKNOWN, false, error)
  }

  /**
   * 获取网络错误的友好消息
   */
  private getNetworkErrorMessage(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('timeout')) {
      return '网络连接超时，请检查网络状态'
    }

    if (message.includes('econnrefused')) {
      return '无法连接到服务器，请稍后重试'
    }

    if (message.includes('enotfound')) {
      return '无法解析服务器地址，请检查网络连接'
    }

    return '网络连接异常，请检查网络状态'
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(retryCount: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount - 1)
    return Math.min(delay, this.config.maxDelay)
  }

  /**
   * 记录错误
   */
  private recordError(error: AppError, retryCount: number): void {
    const errorState: ErrorState = {
      ...error.toErrorState(),
      retryCount
    }

    this.errorHistory.push(errorState)

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }

    console.error(`[${error.type}] ${error.message}`, {
      retryCount,
      timestamp: errorState.timestamp
    })
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorState[] {
    return [...this.errorHistory]
  }

  /**
   * 获取最近的错误
   */
  getLastError(): ErrorState | null {
    return this.errorHistory.length > 0 ? this.errorHistory[this.errorHistory.length - 1] : null
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// 单例实例
let errorHandlerInstance: ErrorHandler | null = null

/**
 * 获取错误处理器单例
 */
export function getErrorHandler(): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler()
  }
  return errorHandlerInstance
}

/**
 * 重置错误处理器（用于测试）
 */
export function resetErrorHandler(): void {
  errorHandlerInstance = null
}

/**
 * 便捷函数：带重试的异步操作
 */
export async function withRetry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  return getErrorHandler().withRetry(fn, context)
}
