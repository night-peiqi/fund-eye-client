import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'

const electronAPI = {
  // 基金操作
  searchFund: (code: string) => ipcRenderer.invoke(IPC_CHANNELS.FUND_SEARCH, code),
  addFund: (code: string) => ipcRenderer.invoke(IPC_CHANNELS.FUND_ADD, code),
  removeFund: (code: string) => ipcRenderer.invoke(IPC_CHANNELS.FUND_REMOVE, code),

  // 估值更新
  onValuationUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on(IPC_CHANNELS.VALUATION_UPDATE, (_event, data) => callback(data))
  },
  refreshValuation: () => ipcRenderer.invoke(IPC_CHANNELS.VALUATION_REFRESH),

  // 自选列表
  getWatchlist: () => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_GET),
  saveWatchlist: (funds: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_SAVE, funds),
  clearWatchlist: () => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_CLEAR),

  // 应用更新
  checkUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
  onUpdateAvailable: (
    callback: (data: { version: string; releaseDate: string; releaseNotes?: string }) => void
  ) => {
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, (_event, data) => callback(data))
  },
  onUpdateProgress: (
    callback: (data: { percent: number; transferred: number; total: number }) => void
  ) => {
    ipcRenderer.on(IPC_CHANNELS.UPDATE_PROGRESS, (_event, data) => callback(data))
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, () => callback())
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, (_event, error) => callback(error))
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
