// ===== 前端 IPC 通信封装 =====
//
// 这个文件是前端（Vue）与后端（主进程）通信的唯一入口
// 为什么要封装一层？
//   1. 统一错误处理：所有后端返回的 {code, data, message} 在这里集中检查
//   2. 统一日志：方便调试
//   3. 统一接口：调用时更清晰，可读性更好

const api = window.electronAPI

/**
 * 通用调用：所有 invoke: 通道的封装
 * 后端返回统一格式: { code: 200|4xx|5xx, data: any, message: string }
 */
async function call(channel, params = {}) {
  try {
    const res = await api.invoke(channel, params)
    if (res.code !== 200) {
      console.warn(`[IPC] ${channel} 错误:`, res.message)
    }
    return res
  } catch (err) {
    console.error(`[IPC] ${channel} 异常:`, err)
    return { code: 500, data: null, message: err.message }
  }
}

// ===== 业务方法 =====
export const userApi = {
  getName: () => call('invoke:get-user-name'),
  setName: (name) => call('invoke:set-user-name', { name })
}

export const deviceApi = {
  startDiscovery: () => call('invoke:start-discovery'),
  stopDiscovery: () => call('invoke:stop-discovery'),
  refreshDiscovery: () => call('invoke:refresh-discovery'),
  connect: (targetIp, targetPort) => call('invoke:connect-device', { targetIp, targetPort }),
  disconnect: (deviceIp) => call('invoke:disconnect-device', { deviceIp })
}

export const chatApi = {
  sendMessage: (targetIp, content) => call('invoke:send-message', { targetIp, content }),
  sendImage: (targetIp, filePath) => call('invoke:send-image', { targetIp, filePath }),
  getHistory: (deviceIp, page = 1, pageSize = 20) => call('invoke:get-chat-history', { deviceIp, page, pageSize }),
  getRecentContacts: () => call('invoke:get-recent-contacts'),
  getUnreadCount: (deviceIp) => call('invoke:get-unread-count', { deviceIp }),
  deleteMessage: (messageId) => call('invoke:delete-message', { messageId })
}

export const imageApi = {
  select: () => call('invoke:select-image'),
  getPath: (relativePath) => call('invoke:get-image-path', { relativePath })
}

// ===== 事件订阅 =====
export const eventApi = {
  /**
   * 订阅主进程推送的事件
   * @param {string} channel - 事件通道
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅的函数
   */
  on(channel, callback) {
    return api.on(channel, callback)
  }
}
