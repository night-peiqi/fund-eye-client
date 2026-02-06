import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

let mainWindow: BrowserWindow | null = null

/**
 * 初始化自动更新服务
 */
export function initAutoUpdater(win: BrowserWindow) {
  mainWindow = win

  // 配置
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 检查更新事件
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  // 下载完成
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED)
  })

  // 错误处理
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send(IPC_CHANNELS.UPDATE_ERROR, err.message)
  })

  // IPC 处理
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, data: result?.updateInfo }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // 启动时检查更新（延迟 3 秒）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)
}
