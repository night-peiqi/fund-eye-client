/**
 * 主进程类型定义
 * 重新导出各模块的接口类型
 */

export type { IFundService, IStockService } from './fetchers'
export type { IValuationService } from './calculator'

import type { Fund } from '@shared/types'

/**
 * 存储服务接口
 */
export interface IStorageService {
  getWatchlist(): Fund[]
  saveWatchlist(funds: Fund[]): void
}
