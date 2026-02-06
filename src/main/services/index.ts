// 服务模块导出
export { StorageService, getStorageService, resetStorageService } from './storage-service'
export { IPCHandler, getIPCHandler, resetIPCHandler } from './ipc-handler'
export type { IPCResult } from './ipc-handler'
export { UpdateScheduler, getUpdateScheduler, resetUpdateScheduler } from './update-scheduler'
export type { SchedulerConfig, SchedulerStatus } from './update-scheduler'
export {
  ErrorHandler,
  getErrorHandler,
  resetErrorHandler,
  withRetry,
  AppError,
  NetworkError,
  ParseError,
  StorageError,
  NotFoundError,
  ErrorType
} from './error-handler'
export type { ErrorState, RetryConfig } from './error-handler'
