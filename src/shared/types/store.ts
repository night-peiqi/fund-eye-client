import type { Fund } from './fund'

/**
 * 自选列表状态
 */
export interface WatchlistState {
  funds: Fund[]
  loading: boolean
  error: string | null
  lastUpdateTime: string | null
}

/**
 * 错误状态
 */
export interface ErrorState {
  type: 'network' | 'parse' | 'storage' | 'notFound'
  message: string
  retryable: boolean
  timestamp: string
}
