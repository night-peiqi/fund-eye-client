import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { getIPCHandler, resetIPCHandler } from '@main/services/ipc-handler'
import { getUpdateScheduler, resetUpdateScheduler } from '@main/services/update-scheduler'
import { getNetValueUpdater, resetNetValueUpdater } from '@main/services/net-value-updater'
import { initAutoUpdater } from '@main/services/auto-updater'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 988,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'FundEye'
  })

  // 初始化 IPC 处理器
  const ipcHandler = getIPCHandler()
  ipcHandler.initialize(mainWindow)

  // 启动估值更新调度器（智能模式：仅在交易时间内执行更新）
  const scheduler = getUpdateScheduler()
  scheduler.startSmart()

  // 启动净值更新服务（收盘后获取真实净值）
  const netValueUpdater = getNetValueUpdater()
  netValueUpdater.start()

  // 初始化自动更新（仅生产环境）
  if (!process.env.VITE_DEV_SERVER_URL) {
    initAutoUpdater(mainWindow)
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 开发模式下，页面加载完成后打开控制台
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.openDevTools()
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    // 停止调度器
    scheduler.stop()
    // 停止净值更新服务
    netValueUpdater.stop()
    // 清理 IPC 处理器
    resetIPCHandler()
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // 停止调度器
  resetUpdateScheduler()
  // 停止净值更新服务
  resetNetValueUpdater()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
