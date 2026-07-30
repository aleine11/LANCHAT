// ===== Electron 主进程入口 =====
//
// 整体流程：
//   1. 启动时初始化数据库、建表
//   2. 启动 UDP 设备发现 + TCP 服务端（监听 5678/5679）
//   3. 创建窗口，注册所有 IPC 处理器
//   4. 网络事件（发现设备/收到消息）通过 webContents.send 推送给前端
//   5. 前端通过 invoke: 调用主进程执行操作

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { join } = require('path')
const os = require('os')
const fs = require('fs')

// ===== M2 数据库模块 =====
const { initTables, closeDatabase } = require('./db/database')
const { getConfig, setConfig } = require('./db/configDao')
const { insertMessage, getChatHistory, markAsRead, getUnreadCount,
        upsertContact, getRecentContacts, clearUnread } = require('./db/chatDao')

// ===== M3 网络模块 =====
const { startDiscovery, stopDiscovery, refreshDiscovery, getDiscoveredDevices } = require('./udp/discovery')
const { startServer, stopServer, sendMessage, isConnected, disconnectClient } = require('./tcp/server')
const { connectToDevice } = require('./tcp/client')
const { getLocalIP } = require('./utils/netUtil')

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

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ===== 应用生命周期 =====
app.whenReady().then(() => {
  initTables()              // [M2] 建表
  registerIpcHandlers()     // [M4] 注册 IPC
  startNetworkServices()    // [M4] 启动 UDP/TCP
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopNetworkServices()    // [M4] 停止网络
  closeDatabase()          // [M2] 关闭数据库
})

// ===== 窗口控制 IPC =====
ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow && mainWindow.close())

// ====================================================
//  [M4] 启动网络服务（UDP发现 + TCP服务端）
// ====================================================
function startNetworkServices() {
  const userName = getConfig('user_name', '用户-' + (os.hostname() || 'Unknown'))

  // 启动 UDP 设备发现
  startDiscovery({
    userName,
    tcpPort: 5679,
    onDiscovered: (device) => {
      // 通知前端
      mainWindow?.webContents.send('on:device-discovered', device)
    },
    onOffline: (device) => {
      mainWindow?.webContents.send('on:device-offline', device)
    }
  })

  // 启动 TCP 服务端
  startServer({
    onMessage: (msg) => {
      // 收到 TCP 消息 → 保存到数据库 → 通知前端
      const isImage = msg.messageType === 'image'
      insertMessage({
        deviceIp: msg.fromIp,
        deviceName: msg.fromName || '未知设备',
        content: msg.content,
        contentType: msg.messageType || 'text',
        isSelf: 0,  // 收到的消息
        thumbnailPath: msg.thumbnailPath,
        imagePath: msg.imagePath,
        imageSize: msg.imageSize,
        messageId: msg.messageId,
        createdAt: msg.timestamp
      })
      // 更新联系人
      upsertContact({
        deviceIp: msg.fromIp,
        deviceName: msg.fromName || '未知设备',
        lastMessage: isImage ? '[图片]' : msg.content,
        isFromOther: true
      })
      // 推送给前端
      mainWindow?.webContents.send('on:message-received', {
        fromIp: msg.fromIp,
        fromName: msg.fromName,
        messageType: msg.messageType,
        content: msg.content,
        thumbnailPath: msg.thumbnailPath,
        imagePath: msg.imagePath,
        imageSize: msg.imageSize,
        timestamp: msg.timestamp,
        messageId: msg.messageId
      })
    },
    onConnection: (info) => {
      mainWindow?.webContents.send('on:connection-changed', info)
    }
  })
}

function stopNetworkServices() {
  stopDiscovery()
  stopServer()
}

// ====================================================
//  [M4] 全部 IPC 处理器注册
// ====================================================
function registerIpcHandlers() {
  // ===== 用户配置 =====
  ipcMain.handle('invoke:set-user-name', async (_e, { name }) => {
    if (!name || !name.trim()) return { code: 400, data: null, message: '名称不能为空' }
    if (name.length > 20) return { code: 400, data: null, message: '名称最长20个字符' }
    setConfig('user_name', name.trim())
    return { code: 200, data: null, message: 'success' }
  })

  ipcMain.handle('invoke:get-user-name', async () => {
    const name = getConfig('user_name', '用户-' + (os.hostname() || 'Unknown'))
    return { code: 200, data: { name, ip: getLocalIP() }, message: 'success' }
  })

  // ===== 设备发现 =====
  ipcMain.handle('invoke:start-discovery', async () => {
    const userName = getConfig('user_name', '用户-' + (os.hostname() || 'Unknown'))
    startDiscovery({
      userName,
      tcpPort: 5679,
      onDiscovered: (device) => mainWindow?.webContents.send('on:device-discovered', device),
      onOffline: (device) => mainWindow?.webContents.send('on:device-offline', device)
    })
    return { code: 200, data: { success: true, port: 5678 }, message: 'success' }
  })

  ipcMain.handle('invoke:stop-discovery', async () => {
    stopDiscovery()
    return { code: 200, data: { success: true }, message: 'success' }
  })

  ipcMain.handle('invoke:refresh-discovery', async () => {
    refreshDiscovery()
    const devices = getDiscoveredDevices()
    return { code: 200, data: { success: true, devices }, message: 'success' }
  })

  // ===== 聊天连接 =====
  ipcMain.handle('invoke:connect-device', async (_e, { targetIp, targetPort }) => {
    if (!targetIp) return { code: 400, data: null, message: '目标IP不能为空' }
    mainWindow?.webContents.send('on:connection-changed', { deviceIp: targetIp, status: 'connecting' })
    const result = await connectToDevice(targetIp, targetPort || 5679)
    if (result.success) {
      // 通知联系人表
      upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: '开始聊天' })
    }
    return { code: result.success ? 200 : 408, data: result, message: result.message || 'success' }
  })

  ipcMain.handle('invoke:disconnect-device', async (_e, { deviceIp }) => {
    disconnectClient(deviceIp)
    return { code: 200, data: { success: true }, message: 'success' }
  })

  // ===== 消息收发 =====
  ipcMain.handle('invoke:send-message', async (_e, { targetIp, content }) => {
    if (!targetIp || !content) return { code: 400, data: null, message: '参数错误' }
    const messageId = require('crypto').randomUUID()
    const timestamp = new Date().toISOString()
    const userName = getConfig('user_name', '我')

    // 通过 TCP 发送
    const sent = sendMessage(targetIp, {
      type: 'text',
      content,
      messageId,
      timestamp,
      fromName: userName
    })

    if (sent) {
      // 保存到数据库
      insertMessage({
        deviceIp: targetIp,
        deviceName: '对方',
        content,
        contentType: 'text',
        isSelf: 1,
        messageId,
        createdAt: timestamp
      })
      // 更新联系人
      upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: content })
    }

    return { code: sent ? 200 : 401, data: { success: sent, messageId, timestamp }, message: sent ? 'success' : '连接未建立' }
  })

  ipcMain.handle('invoke:send-image', async (_e, { targetIp, filePath }) => {
    if (!targetIp || !filePath) return { code: 400, data: null, message: '参数错误' }
    if (!fs.existsSync(filePath)) return { code: 404, data: null, message: '图片不存在' }
    const stat = fs.statSync(filePath)
    if (stat.size > 20 * 1024 * 1024) return { code: 1005, data: null, message: '图片不能超过20MB' }

    const messageId = require('crypto').randomUUID()
    const timestamp = new Date().toISOString()
    const userName = getConfig('user_name', '我')
    const fileName = require('path').basename(filePath)

    // 读取图片转 base64
    const imageBuffer = fs.readFileSync(filePath)
    const base64Image = imageBuffer.toString('base64')

    const sent = sendMessage(targetIp, {
      type: 'image',
      messageType: 'image',
      content: base64Image,
      fileName,
      imageSize: stat.size,
      messageId,
      timestamp,
      fromName: userName
    })

    if (sent) {
      // 保存缩略图到本地（简化处理：直接用原图）
      const thumbDir = join(app.getPath('userData'), 'LanChat', 'images')
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true })
      const ext = require('path').extname(filePath) || '.jpg'
      const saveName = `${messageId}${ext}`
      const savePath = join(thumbDir, saveName)
      fs.copyFileSync(filePath, savePath)
      const relPath = `images/${saveName}`

      insertMessage({
        deviceIp: targetIp,
        deviceName: '对方',
        content: relPath,
        contentType: 'image',
        isSelf: 1,
        thumbnailPath: relPath,
        imagePath: relPath,
        imageSize: stat.size,
        messageId,
        createdAt: timestamp
      })
      upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: '[图片]' })
    }

    return { code: sent ? 200 : 401, data: { success: sent, messageId, timestamp }, message: sent ? 'success' : '连接未建立' }
  })

  // ===== 聊天记录 =====
  ipcMain.handle('invoke:get-chat-history', async (_e, { deviceIp, page, pageSize }) => {
    if (!deviceIp) return { code: 400, data: null, message: '设备IP不能为空' }
    const result = getChatHistory(deviceIp, page || 1, pageSize || 20)
    // 查历史时标记已读
    markAsRead(deviceIp)
    clearUnread(deviceIp)
    return { code: 200, data: result, message: 'success' }
  })

  ipcMain.handle('invoke:get-recent-contacts', async () => {
    const list = getRecentContacts()
    return { code: 200, data: { list }, message: 'success' }
  })

  ipcMain.handle('invoke:get-unread-count', async (_e, { deviceIp }) => {
    if (!deviceIp) return { code: 400, data: null, message: '设备IP不能为空' }
    return { code: 200, data: { count: getUnreadCount(deviceIp) }, message: 'success' }
  })

  // ===== 图片选择 =====
  ipcMain.handle('invoke:select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片',
      filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { code: 200, data: { success: false }, message: '用户取消' }
    }
    const filePath = result.filePaths[0]
    const stat = fs.statSync(filePath)
    if (stat.size > 20 * 1024 * 1024) return { code: 1005, data: null, message: '图片不能超过20MB' }
    return {
      code: 200,
      data: { success: true, filePath, fileName: require('path').basename(filePath), fileSize: stat.size },
      message: 'success'
    }
  })

  ipcMain.handle('invoke:get-image-path', async (_e, { relativePath }) => {
    const fullPath = join(app.getPath('userData'), 'LanChat', relativePath)
    return { code: 200, data: { fullPath }, message: 'success' }
  })

  console.log('[IPC] 全部16个处理器注册完成')
}
