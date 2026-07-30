// ===== Electron 主进程入口 =====
// 主进程是 Electron 的"管家"：
//   1. 创建窗口
//   2. 管理应用生命周期
//   3. 处理 IPC 通信（后续模块逐步接入）
//   4. 访问 Node.js 底层能力（文件系统、网络等）

const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('path')

// 引入数据库模块（M2 新增）
const { initTables, closeDatabase } = require('./db/database')

// 判断是否开发模式
const isDev = !app.isPackaged

let mainWindow = null

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 680,
    minHeight: 500,
    // 无边框窗口（后续用自定义标题栏）
    frame: false,
    // 窗口背景色（避免白屏闪烁）
    backgroundColor: '#F0F3F7',
    webPreferences: {
      // 预加载脚本路径
      preload: join(__dirname, 'preload.js'),
      // 安全限制：渲染进程不能直接访问 Node.js API
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    // 窗口图标
    icon: join(__dirname, '../src/assets/icons/icon.png'),
    // 显示时机：等页面加载完再显示，避免白屏
    show: false
  })

  // 页面准备好后再显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 加载页面
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    // 开发模式下自动打开开发者工具
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 生产模式：加载打包后的 HTML
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ===== 应用生命周期 =====

// 当 Electron 初始化完成后创建窗口
app.whenReady().then(() => {
  // [M2] 初始化数据库（建表）
  initTables()

  createWindow()

  // macOS：点击 Dock 图标重新创建窗口（Windows 不需要，但保留兼容）
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// [M2] 应用退出前关闭数据库连接
app.on('before-quit', () => {
  closeDatabase()
})

// ===== 窗口控制 IPC =====
// 自定义标题栏的按钮会通过 preload 发送这些消息

// 最小化窗口
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

// 最大化/还原窗口
ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

// 关闭窗口
ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close()
})
