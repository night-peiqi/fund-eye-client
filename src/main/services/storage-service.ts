import Store from 'electron-store'
import type { Fund } from '@shared/types'
import type { StorageSchema, StoredFund } from '@shared/types/storage'
import type { IStorageService } from '../types'

// Current storage version for migration handling
const CURRENT_VERSION = 1

// Default storage schema values
const DEFAULT_STORAGE: StorageSchema = {
  watchlist: {
    funds: [],
    version: CURRENT_VERSION
  },
  settings: {
    theme: 'light'
  }
}

/**
 * 存储服务 - 使用 electron-store 实现本地持久化
 *
 * Requirements:
 * - 4.1: 用户添加或删除自选基金时立即保存到本地存储
 * - 4.2: 应用启动时从本地存储加载之前保存的自选列表
 */
export class StorageService implements IStorageService {
  private store: Store<StorageSchema>

  constructor() {
    this.store = new Store<StorageSchema>({
      name: 'fund-eye-data',
      defaults: DEFAULT_STORAGE,
      // Schema validation for type safety
      schema: {
        watchlist: {
          type: 'object',
          properties: {
            funds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  netValue: { type: 'number' },
                  netValueDate: { type: 'string' },
                  holdings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        stockCode: { type: 'string' },
                        stockName: { type: 'string' },
                        ratio: { type: 'number' }
                      },
                      required: ['stockCode', 'stockName', 'ratio']
                    }
                  },
                  addedAt: { type: 'string' }
                },
                required: ['code', 'name', 'netValue', 'netValueDate', 'holdings', 'addedAt']
              }
            },
            version: { type: 'number' }
          },
          required: ['funds', 'version']
        },
        settings: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark'] }
          },
          required: ['theme']
        }
      }
    })

    // Run migration on initialization
    this.migrateIfNeeded()
  }

  /**
   * 获取自选列表
   * Requirement 4.2: 应用启动时从本地存储加载之前保存的自选列表
   */
  getWatchlist(): Fund[] {
    try {
      const watchlist = this.store.get('watchlist')
      return watchlist.funds.map(this.storedFundToFund)
    } catch (error) {
      console.error('Failed to load watchlist:', error)
      // Requirement 4.3: 本地存储数据损坏时初始化空列表
      this.store.set('watchlist', DEFAULT_STORAGE.watchlist)
      return []
    }
  }

  /**
   * 保存自选列表
   * Requirement 4.1: 用户添加或删除自选基金时立即保存到本地存储
   */
  saveWatchlist(funds: Fund[]): void {
    try {
      const storedFunds = funds.map(this.fundToStoredFund)
      this.store.set('watchlist', {
        funds: storedFunds,
        version: CURRENT_VERSION
      })
    } catch (error) {
      console.error('Failed to save watchlist:', error)
      throw new Error('保存自选列表失败')
    }
  }

  /**
   * 获取设置
   */
  getSettings(): StorageSchema['settings'] {
    return this.store.get('settings')
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<StorageSchema['settings']>): void {
    const currentSettings = this.store.get('settings')
    this.store.set('settings', { ...currentSettings, ...settings })
  }

  /**
   * 清空所有数据（用于测试或重置）
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * 获取存储文件路径（用于调试）
   */
  getStorePath(): string {
    return this.store.path
  }

  /**
   * 数据版本迁移
   * 处理不同版本之间的数据结构变化
   */
  private migrateIfNeeded(): void {
    const watchlist = this.store.get('watchlist')
    const currentVersion = watchlist?.version ?? 0

    if (currentVersion < CURRENT_VERSION) {
      console.log(`Migrating storage from version ${currentVersion} to ${CURRENT_VERSION}`)

      // Version 0 -> 1: Initial migration (add version field)
      if (currentVersion === 0) {
        const funds = watchlist?.funds ?? []
        this.store.set('watchlist', {
          funds,
          version: 1
        })
      }

      // Future migrations can be added here:
      // if (currentVersion < 2) { ... }
    }
  }

  /**
   * 将存储格式转换为运行时格式
   */
  private storedFundToFund(stored: StoredFund): Fund {
    return {
      code: stored.code,
      name: stored.name,
      netValue: stored.netValue,
      netValueDate: stored.netValueDate,
      estimatedValue: stored.estimatedValue ?? stored.netValue,
      estimatedChange: stored.estimatedChange ?? 0,
      updateTime: stored.updateTime ?? stored.addedAt,
      isRealValue: stored.isRealValue ?? false,
      holdings: stored.holdings.map((h) => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        ratio: h.ratio,
        change: 0,
        price: 0
      }))
    }
  }

  /**
   * 将运行时格式转换为存储格式
   */
  private fundToStoredFund(fund: Fund): StoredFund {
    return {
      code: fund.code,
      name: fund.name,
      netValue: fund.netValue,
      netValueDate: fund.netValueDate,
      estimatedValue: fund.estimatedValue,
      estimatedChange: fund.estimatedChange,
      updateTime: fund.updateTime,
      isRealValue: fund.isRealValue,
      holdings: fund.holdings.map((h) => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        ratio: h.ratio
      })),
      addedAt: fund.updateTime || new Date().toISOString()
    }
  }
}

// 单例实例
let storageServiceInstance: StorageService | null = null

/**
 * 获取存储服务单例
 */
export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService()
  }
  return storageServiceInstance
}

/**
 * 重置存储服务（用于测试）
 */
export function resetStorageService(): void {
  storageServiceInstance = null
}
