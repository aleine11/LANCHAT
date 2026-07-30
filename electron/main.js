// ===== Electron 主进程入口 =====
// 主进程是 Electron 的"管家"：
//   1. 创建窗口
//   2. 管理应用生命周期
//   3. 处理 IPC 通信（注册所有 invoke: 处理函数 + 窗口控制）
//   4. 访问 Node.js 底层能力（文件系统、网络、数据库等）

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { join } = require('path')
const os = require('os')

// 引入数据库模块（M2）
const { initTables, closeDatabase } = require('./db/database')

// 判断是否开发模式
const isDev = !app.isPackaged

let mainWindow = null

// ===== 窗口创建 =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 680,
    minHeight: 500,
    frame: false,
    backgroundColor: '#F0F3F7',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: join(__dirname, '../src/assets/icons/icon.png'),
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ===== 应用生命周期 =====
app.whenReady().then(() => {
  initTables()                // [M2] 初始化数据库
  registerIpcHandlers()       // [M4] 注册所有 IPC 处理器
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()             // [M2] 关闭数据库
})

// ===== 窗口控制 IPC =====
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  }
})

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close()
})

// ====================================================
//  [M4] IPC 业务处理器注册
//  统一格式: { code: 200, data: any, message: string }
// ====================================================

function registerIpcHandlers() {
  const { getConfig, setConfig } = require('./db/configDao')
  const { insertMessage, getChatHistory, markAsRead, getUnreadCount,
          upsertContact, getRecentContacts, clearUnread } = require('./db/chatDao')

  // ───────── 用户配置 ─────────

  ipcMain.handle('invoke:set-user-name', async (_event, { name }) => {
    if (!name || name.trim().length === 0) {
      return { code: 400, data: null, message: '名称不能为空' }
    }
    if (name.length > 20) {
      return { code: 400, data: null, message: '名称最长20个字符' }
    }
    setConfig('user_name', name.trim())
    return { code: 200, data: null, message: 'success' }
  })

  ipcMain.handle('invoke:get-user-name', async () => {
    const name = getConfig('user_name',
      '用户-' + (os.hostname() || 'Unknown'))
    return { code: 200, data: { name }, message: 'success' }
  })

  // ───────── 聊天记录 ─────────

  ipcMain.handle('invoke:get-chat-history', async (_event, { deviceIp, page, pageSize }) => {
    if (!deviceIp) {
      return { code: 400, data: null, message: '设备IP不能为空' }
    }
    const result = getChatHistory(deviceIp, page || 1, pageSize || 20)
    // 查历史记录时把该设备的未读消息标为已读
    markAsRead(deviceIp)
    clearUnread(deviceIp)
    return { code: 200, data: result, message: 'success' }
  })

  ipcMain.handle('invoke:get-recent-contacts', async () => {
    const list = getRecentContacts()
    return { code: 200, data: { list }, message: 'success' }
  })

  ipcMain.handle('invoke:get-unread-count', async (_event, { deviceIp }) => {
    if (!deviceIp) {
      return { code: 400, data: null, message: '设备IP不能为空' }
    }
    const count = getUnreadCount(deviceIp)
    return { code: 200, data: { count }, message: 'success' }
  })

  // ───────── 图片选择 ─────────

  ipcMain.handle('invoke:select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片',
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { code: 200, data: { success: false }, message: '用户取消' }
    }
    const fs = require('fs')
    const filePath = result.filePaths[0]
    const stat = fs.statSync(filePath)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (stat.size > maxSize) {
      return { code: 1005, data: null, message: '图片大小不能超过20MB' }
    }
    return {
      code: 200,
      data: {
        success: true,
        filePath,
        fileName: require('path').basename(filePath),
        fileSize: stat.size
      },
      message: 'success'
    }
  })

  ipcMain.handle('invoke:get-image-path', async (_event, { relativePath }) => {
    const { app } = require('electron')
    const path = require('path')
    const fullPath = path.join(app.getPath('userData'), 'LanChat', relativePath)
    return { code: 200, data: { fullPath }, message: 'success' }
  })

  // ───────── 网络相关（占位桩，M3 开发后替换）─────────

  ipcMain.handle('invoke:start-discovery', async () => {
    return { code: 200, data: { success: true, port: 5678 }, message: '占位桩：M3实现' }
  })

  ipcMain.handle('invoke:stop-discovery', async () => {
    return { code: 200, data: { success: true }, message: '占位桩：M3实现' }
  })

  ipcMain.handle('invoke:connect-device', async () => {
    return { code: 200, data: { success: true }, message: '占位桩：M3实现' }
  })

  ipcMain.handle('invoke:disconnect-device', async () => {
    return { code: 200, data: { success: true }, message: '占位桩：M3实现' }
  })

  ipcMain.handle('invoke:send-message', async (_event, { targetIp, content }) => {
    return { code: 200, data: { success: true }, message: '占位桩：M3实现' }
  })

  ipcMain.handle('invoke:send-image', async (_event, { targetIp, filePath }) => {
    return { code: 200, data: { success: true }, message: '占位桩：M3实现' }
  })

  console.log('[IPC] 全部16个处理器注册完成')
}
