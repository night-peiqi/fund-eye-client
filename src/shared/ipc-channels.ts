/**
 * IPC 通信通道常量定义
 * 用于主进程和渲染进程之间的通信
 */
export const IPC_CHANNELS = {
  // 基金操作
  FUND_SEARCH: 'fund:search',
  FUND_ADD: 'fund:add',
  FUND_REMOVE: 'fund:remove',

  // 数据更新
  VALUATION_UPDATE: 'valuation:update',
  VALUATION_REFRESH: 'valuation:refresh',

  // 自选列表
  WATCHLIST_GET: 'watchlist:get',
  WATCHLIST_SAVE: 'watchlist:save',
  WATCHLIST_CLEAR: 'watchlist:clear',

  // 应用更新
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_PROGRESS: 'update:progress',
  UPDATE_DOWNLOADED: 'update:downloaded',
  UPDATE_ERROR: 'update:error'
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
