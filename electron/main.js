// ===== Electron 主进程入口 =====
//
// 整体流程：
//   1. 启动时初始化数据库、建表
//   2. 启动 UDP 设备发现 + TCP 服务端（监听 5678/5679）
//   3. 创建窗口，注册所有 IPC 处理器
//   4. 网络事件通过 webContents.send 推送给前端
//   5. 前端通过 invoke 调用主进程执行操作

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')

// ===== 数据库模块 =====
const { initTables, closeDatabase } = require('./db/database')
const { getConfig, setConfig, getAllConfig } = require('./db/configDao')
const { insertMessage, updateMessageStatus, getPendingMessages, deleteMessage,
  getChatHistory, getAllMessages, markAsRead, getUnreadCount,
  upsertContact, getRecentContacts, clearUnread } = require('./db/chatDao')

// ===== 网络模块 =====
const { startDiscovery, stopDiscovery, refreshDiscovery, getDiscoveredDevices } = require('./udp/discovery')
const { startServer, stopServer, sendMessage, disconnectClient } = require('./tcp/server')
const { connectToDevice } = require('./tcp/client')
const { getLocalIP } = require('./utils/netUtil')
const { saveImage, saveBase64Image } = require('./utils/imageUtil')

// Windows 任务栏图标关联
if (process.platform === 'win32') {
  app.setAppUserModelId('com.lanchat.desktop')
}

const isDev = !app.isPackaged
let mainWindow = null
let tray = null

// 获取正确的图标路径（开发/生产模式兼容）
function getIconPath() {
  if (isDev) {
    return path.join(__dirname, '../src/assets/icons/icon.png')
  } else {
    return path.join(process.resourcesPath, 'build', 'icon.ico')
  }
}

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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    },
    icon: getIconPath(),
    show: false
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

// ===== 系统托盘 =====
function createTray() {
  const trayIconPath = isDev
    ? path.join(__dirname, '../src/assets/icons/tray.png')
    : path.join(process.resourcesPath, 'build', 'icon.ico')

  let icon
  try {
    icon = nativeImage.createFromPath(trayIconPath)
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty()
    } else {
      icon = icon.resize({ width: 16, height: 16 })
    }
  } catch (e) {
    icon = nativeImage.createEmpty()
  }
  tray = new Tray(icon)
  tray.setToolTip('LanChat')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => { mainWindow?.show() } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show() })
}

// ===== 应用生命周期 =====
app.whenReady().then(() => {
  initTables()
  registerIpcHandlers()
  startNetworkServices()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopNetworkServices()
  closeDatabase()
})

// ===== 窗口控制 IPC =====
ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow && mainWindow.close())

// ===== 启动网络服务 =====
function retryPendingMessages(deviceIp) {
  const pendings = getPendingMessages(deviceIp)
  if (pendings.length === 0) return
  const userName = getConfig('user_name', '我')
  let successCount = 0

  for (const msg of pendings) {
    let payload = null
    if (msg.content_type === 'text') {
      payload = {
        type: 'text',
        content: msg.content,
        messageId: msg.message_id,
        timestamp: msg.created_at,
        fromName: userName
      }
    } else if (msg.content_type === 'image') {
      try {
        const fullPath = path.join(app.getPath('userData'), 'LanChat', msg.image_path || msg.content)
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath)
          payload = {
            type: 'image',
            messageType: 'image',
            content: buf.toString('base64'),
            imageSize: msg.image_size,
            messageId: msg.message_id,
            timestamp: msg.created_at,
            fromName: userName
          }
        }
      } catch (e) { /* skip */ }
    }

    if (payload) {
      const sent = sendMessage(deviceIp, payload)
      if (sent) {
        updateMessageStatus(msg.message_id, 'sent')
        successCount++
      } else {
        updateMessageStatus(msg.message_id, 'failed')
      }
    }
  }

  console.log(`[Main] 重试完成: ${successCount}/${pendings.length} 成功`)
  mainWindow?.webContents.send('on:retry-completed', {
    deviceIp,
    retried: pendings.length,
    success: successCount
  })
}

function startNetworkServices() {
  const userName = getConfig('user_name', '用户-' + (os.hostname() || 'Unknown'))

  startDiscovery({
    userName,
    tcpPort: 5679,
    onDiscovered: (device) => {
      mainWindow?.webContents.send('on:device-discovered', device)
    },
    onOffline: (device) => {
      mainWindow?.webContents.send('on:device-offline', device)
    }
  })

  startServer({
    onMessage: (msg) => {
      const isImage = msg.messageType === 'image'
      let content = msg.content
      let imagePath = null
      let thumbnailPath = null

      if (isImage && msg.content) {
        try {
          const dataUrl = `data:image/jpeg;base64,${msg.content}`
          const saved = saveBase64Image(dataUrl, 'recv')
          content = saved.relativePath
          imagePath = saved.relativePath
          thumbnailPath = saved.relativePath
        } catch (e) {
          console.error('[Main] 保存收到图片失败:', e.message)
        }
      }

      insertMessage({
        deviceIp: msg.fromIp,
        deviceName: msg.fromName || '未知设备',
        content,
        contentType: msg.messageType || 'text',
        isSelf: 0,
        thumbnailPath,
        imagePath,
        imageSize: msg.imageSize,
        messageId: msg.messageId,
        createdAt: msg.timestamp
      })

      upsertContact({
        deviceIp: msg.fromIp,
        deviceName: msg.fromName || '未知设备',
        lastMessage: isImage ? '[图片]' : msg.content,
        isFromOther: true
      })

      mainWindow?.webContents.send('on:message-received', {
        fromIp: msg.fromIp,
        fromName: msg.fromName,
        messageType: msg.messageType,
        content,
        thumbnailPath,
        imagePath,
        imageSize: msg.imageSize,
        timestamp: msg.timestamp,
        messageId: msg.messageId
      })
    },
    onConnection: (info) => {
      mainWindow?.webContents.send('on:connection-changed', info)
      if (info.status === 'connected' && info.deviceIp) {
        setTimeout(() => retryPendingMessages(info.deviceIp), 500)
      }
    }
  })
}

function stopNetworkServices() {
  stopDiscovery()
  stopServer()
}

// ===== IPC 处理器注册 =====
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
      upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: '开始聊天' })
      const pendings = getPendingMessages(targetIp)
      if (pendings.length > 0) {
        console.log(`[Main] 连接成功，重试 ${pendings.length} 条未发送消息给 ${targetIp}`)
        setTimeout(() => retryPendingMessages(targetIp), 500)
      }
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

    insertMessage({
      deviceIp: targetIp,
      deviceName: '对方',
      content,
      contentType: 'text',
      isSelf: 1,
      messageId,
      status: 'pending',
      createdAt: timestamp
    })

    const sent = sendMessage(targetIp, {
      type: 'text',
      content,
      messageId,
      timestamp,
      fromName: userName
    })

    updateMessageStatus(messageId, sent ? 'sent' : 'failed')
    upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: content })

    return {
      code: 200,
      data: { success: sent, messageId, timestamp, status: sent ? 'sent' : 'failed' },
      message: sent ? 'success' : '消息已保存，待重连后发送'
    }
  })

  ipcMain.handle('invoke:send-image', async (_e, { targetIp, filePath }) => {
    if (!targetIp || !filePath) return { code: 400, data: null, message: '参数错误' }

    let imageBuffer, fileName, fileSize, relPath

    if (filePath.startsWith('data:')) {
      const saved = saveBase64Image(filePath, 'paste')
      relPath = saved.relativePath
      imageBuffer = fs.readFileSync(saved.savedPath)
      fileName = saved.fileName
      fileSize = imageBuffer.length
    } else {
      if (!fs.existsSync(filePath)) return { code: 404, data: null, message: '图片不存在' }
      const stat = fs.statSync(filePath)
      if (stat.size > 20 * 1024 * 1024) return { code: 1005, data: null, message: '图片不能超过20MB' }
      fileName = path.basename(filePath)
      fileSize = stat.size

      const saved = saveImage(filePath, 'send')
      relPath = saved.relativePath
      imageBuffer = fs.readFileSync(saved.savedPath)
    }

    const messageId = require('crypto').randomUUID()
    const timestamp = new Date().toISOString()
    const userName = getConfig('user_name', '我')
    const base64Image = imageBuffer.toString('base64')

    insertMessage({
      deviceIp: targetIp,
      deviceName: '对方',
      content: relPath,
      contentType: 'image',
      isSelf: 1,
      thumbnailPath: relPath,
      imagePath: relPath,
      imageSize: fileSize,
      messageId,
      status: 'pending',
      createdAt: timestamp
    })

    const sent = sendMessage(targetIp, {
      type: 'image',
      messageType: 'image',
      content: base64Image,
      fileName,
      imageSize,
      messageId,
      timestamp,
      fromName: userName
    })

    updateMessageStatus(messageId, sent ? 'sent' : 'failed')
    upsertContact({ deviceIp: targetIp, deviceName: '对方', lastMessage: '[图片]' })

    return {
      code: 200,
      data: { success: sent, messageId, timestamp, status: sent ? 'sent' : 'failed', relPath },
      message: sent ? 'success' : '图片已保存，待重连后发送'
    }
  })

  // 重试未发送消息
  ipcMain.handle('invoke:retry-pending', async (_e, { deviceIp }) => {
    if (!deviceIp) return { code: 400, data: null, message: '设备IP不能为空' }
    const pendings = getPendingMessages(deviceIp)
    const userName = getConfig('user_name', '我')
    let successCount = 0

    for (const msg of pendings) {
      let payload
      if (msg.content_type === 'text') {
        payload = {
          type: 'text',
          content: msg.content,
          messageId: msg.message_id,
          timestamp: msg.created_at,
          fromName: userName
        }
      } else {
        try {
          const fullPath = path.join(app.getPath('userData'), 'LanChat', msg.image_path || msg.content)
          if (fs.existsSync(fullPath)) {
            const buf = fs.readFileSync(fullPath)
            payload = {
              type: 'image',
              messageType: 'image',
              content: buf.toString('base64'),
              imageSize: msg.image_size,
              messageId: msg.message_id,
              timestamp: msg.created_at,
              fromName: userName
            }
          }
        } catch (e) { /* skip */ }
      }

      if (payload) {
        const sent = sendMessage(deviceIp, payload)
        if (sent) {
          updateMessageStatus(msg.message_id, 'sent')
          successCount++
        } else {
          updateMessageStatus(msg.message_id, 'failed')
        }
      }
    }

    return { code: 200, data: { retried: pendings.length, success: successCount }, message: 'success' }
  })

  // 删除消息
  ipcMain.handle('invoke:delete-message', async (_e, { messageId }) => {
    if (!messageId) return { code: 400, data: null, message: '消息ID不能为空' }
    const success = deleteMessage(messageId)
    return { code: success ? 200 : 404, data: { success }, message: success ? '已删除' : '消息不存在' }
  })

  // ===== 聊天记录 =====
  ipcMain.handle('invoke:get-chat-history', async (_e, { deviceIp, page, pageSize }) => {
    if (!deviceIp) return { code: 400, data: null, message: '设备IP不能为空' }
    const result = getChatHistory(deviceIp, page || 1, pageSize || 20)
    markAsRead(deviceIp)
    clearUnread(deviceIp)
    return { code: 200, data: result, message: 'success' }
  })

  ipcMain.handle('invoke:get-all-messages', async (_e, { deviceIp }) => {
    if (!deviceIp) return { code: 400, data: null, message: '设备IP不能为空' }
    const list = getAllMessages(deviceIp)
    markAsRead(deviceIp)
    clearUnread(deviceIp)
    return { code: 200, data: { list }, message: 'success' }
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
      data: { success: true, filePath, fileName: path.basename(filePath), fileSize: stat.size },
      message: 'success'
    }
  })

  ipcMain.handle('invoke:get-image-path', async (_e, { relativePath }) => {
    const fullPath = path.join(app.getPath('userData'), 'LanChat', relativePath)
    return { code: 200, data: { fullPath }, message: 'success' }
  })

  // ===== 配置读写 =====
  ipcMain.handle('invoke:get-all-config', async () => {
    const config = getAllConfig()
    return { code: 200, data: config, message: 'success' }
  })

  ipcMain.handle('invoke:set-config', async (_e, { key, value }) => {
    if (!key) return { code: 400, data: null, message: '配置键不能为空' }
    setConfig(key, value)
    return { code: 200, data: null, message: 'success' }
  })

  // ===== 目录选择 =====
  ipcMain.handle('invoke:select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { code: 200, data: { success: false }, message: '用户取消' }
    }
    return { code: 200, data: { success: true, path: result.filePaths[0] }, message: 'success' }
  })

  // ===== 保存图片到指定位置 =====
  ipcMain.handle('invoke:save-image-to-path', async (_e, { relativePath, defaultName }) => {
    if (!relativePath) return { code: 400, data: null, message: '路径不能为空' }
    const sourcePath = path.join(app.getPath('userData'), 'LanChat', relativePath)
    if (!fs.existsSync(sourcePath)) return { code: 404, data: null, message: '源文件不存在' }

    let saveDir = getConfig('save_location', '')
    if (!saveDir || !fs.existsSync(saveDir)) {
      saveDir = app.getPath('downloads')
    }

    const originalName = defaultName || path.basename(sourcePath)
    let finalName = originalName
    let destPath = path.join(saveDir, finalName)
    let counter = 1
    while (fs.existsSync(destPath)) {
      const ext = path.extname(originalName)
      const base = path.basename(originalName, ext)
      finalName = `${base}_${counter}${ext}`
      destPath = path.join(saveDir, finalName)
      counter++
    }

    try {
      fs.copyFileSync(sourcePath, destPath)
      return { code: 200, data: { success: true, savedPath: destPath, saveDir }, message: 'success' }
    } catch (e) {
      return { code: 500, data: null, message: '保存失败: ' + e.message }
    }
  })

  console.log('[IPC] 所有处理器注册完成')
}
