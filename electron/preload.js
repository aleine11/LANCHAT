// ===== Electron 预加载脚本 =====
// 预加载脚本在主进程和渲染进程之间架起"安全桥梁"
// 通过 contextBridge 暴露有限、安全的 API 给前端 Vue 使用
// 前端不能直接访问 Node.js，只能通过这里暴露的方法调用

const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程（Vue前端）的安全API
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== 通用 IPC 调用 =====
  // 发送请求并等待响应（类似 HTTP 请求）
  invoke: (channel, ...args) => {
    // 白名单：只允许设计文档中定义的通道
    const allowedChannels = [
      'invoke:set-user-name',
      'invoke:get-user-name',
      'invoke:start-discovery',
      'invoke:stop-discovery',
      'invoke:connect-device',
      'invoke:disconnect-device',
      'invoke:send-message',
      'invoke:send-image',
      'invoke:retry-pending',
      'invoke:delete-message',
      'invoke:get-chat-history',
      'invoke:get-all-messages',
      'invoke:get-recent-contacts',
      'invoke:get-unread-count',
      'invoke:select-image',
      'invoke:get-image-path',
      'invoke:get-all-config',
      'invoke:set-config',
      'invoke:select-directory',
      'invoke:save-image-to-path'
    ]
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`不允许的IPC通道: ${channel}`))
  },

  // ===== 事件监听 =====
  // 监听主进程推送的事件（如设备发现、收到消息等）
  on: (channel, callback) => {
    const allowedChannels = [
      'on:device-discovered',
      'on:device-offline',
      'on:connection-changed',
      'on:message-received',
      'on:retry-completed'
    ]
    if (allowedChannels.includes(channel)) {
      // 包装回调，返回取消监听的函数
      const listener = (event, ...args) => callback(...args)
      ipcRenderer.on(channel, listener)
      // 返回取消监听的函数
      return () => ipcRenderer.removeListener(channel, listener)
    }
    console.warn(`不允许的事件通道: ${channel}`)
    return () => {}
  },

  // ===== 窗口控制 =====
  // 给自定义标题栏用的窗口操作
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
})
