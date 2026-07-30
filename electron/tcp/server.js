// ===== TCP 聊天服务端 =====
//
// 负责：监听本机 5679 端口 + 管理所有 TCP 连接（无论是我们主动连出去的，还是别人连进来的）
//
// 原理类比：
//   服务端（server.js）= 既能挂信箱（被连）也能打电话（主动连）
//   在家里挂个 5679 信箱等别人投信 = 监听端口接收连接
//   主动打到别人家 5679 信箱投信 = 客户端主动连接
//   两种方式建立的连接，统一存放在 clients 这个 map 里管理

const net = require('net')

const TCP_PORT = 5679
let server = null
let clients = new Map()  // key: 对方IP, value: socket连接

// 外部回调：收到消息时通知
let onMessageReceived = null
let onConnectionChanged = null

/**
 * 启动 TCP 服务端
 */
function startServer(callbacks = {}) {
  if (server) {
    console.warn('[TCP] 服务端已在运行')
    return
  }

  onMessageReceived = callbacks.onMessage || (() => {})
  onConnectionChanged = callbacks.onConnection || (() => {})

  server = net.createServer((socket) => {
    const remoteIP = socket.remoteAddress.replace(/^::ffff:/, '')
    console.log(`[TCP] 收到连接: ${remoteIP}`)
    addConnection(socket, remoteIP)
  })

  server.listen(TCP_PORT, () => {
    console.log(`[TCP] 服务端已启动，监听端口 ${TCP_PORT}`)
  })

  server.on('error', (err) => {
    console.error('[TCP] 服务端错误:', err.message)
  })
}

/**
 * 把一个已连接的 socket 加入管理
 * （不管是服务端 accept 的，还是客户端主动 connect 的，都走这个）
 */
function addConnection(socket, remoteIP) {
  // 如果已有同IP的连接，先关闭旧的
  if (clients.has(remoteIP)) {
    const oldSocket = clients.get(remoteIP)
    if (!oldSocket.destroyed) oldSocket.destroy()
  }
  clients.set(remoteIP, socket)
  onConnectionChanged({ deviceIp: remoteIP, status: 'connected' })

  // 数据缓冲区：TCP 是流式传输，可能一次收到半条消息
  let buffer = ''

  socket.on('data', (data) => {
    buffer += data.toString()
    // TCP 消息分隔符：每条 JSON 消息以换行符 \n 结尾
    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const messageStr = buffer.substring(0, newlineIndex)
      buffer = buffer.substring(newlineIndex + 1)
      try {
        const msg = JSON.parse(messageStr)
        msg.fromIp = remoteIP
        onMessageReceived(msg)
      } catch (e) {
        console.error('[TCP] 消息解析失败:', messageStr.substring(0, 100))
      }
    }
  })

  socket.on('close', () => {
    console.log(`[TCP] 连接关闭: ${remoteIP}`)
    if (clients.get(remoteIP) === socket) {
      clients.delete(remoteIP)
      onConnectionChanged({ deviceIp: remoteIP, status: 'disconnected' })
    }
  })

  socket.on('error', (err) => {
    console.error(`[TCP] 连接错误 (${remoteIP}):`, err.message)
    if (clients.get(remoteIP) === socket) {
      clients.delete(remoteIP)
      onConnectionChanged({ deviceIp: remoteIP, status: 'error', message: err.message })
    }
  })
}

/**
 * 把主动连出去的 socket 也加入管理
 * 由 client.js 在成功连接后调用
 */
function registerOutgoingConnection(socket, remoteIP) {
  addConnection(socket, remoteIP)
}

/**
 * 向指定设备发送消息（通过已有的TCP连接）
 */
function sendMessage(deviceIp, message) {
  const socket = clients.get(deviceIp)
  if (!socket || socket.destroyed) {
    console.error(`[TCP] 无法发送: 未连接到 ${deviceIp}`)
    return false
  }
  const data = JSON.stringify(message) + '\n'
  socket.write(data)
  return true
}

/**
 * 获取当前已连接的客户端列表
 */
function getConnectedClients() {
  const list = []
  for (const [ip, socket] of clients) {
    if (!socket.destroyed) list.push(ip)
  }
  return list
}

/**
 * 检查是否已连接某设备
 */
function isConnected(deviceIp) {
  const socket = clients.get(deviceIp)
  return socket && !socket.destroyed
}

/**
 * 断开与某设备的连接
 */
function disconnectClient(deviceIp) {
  const socket = clients.get(deviceIp)
  if (socket) {
    socket.destroy()
    clients.delete(deviceIp)
  }
}

/**
 * 停止 TCP 服务端
 */
function stopServer() {
  for (const [ip, socket] of clients) {
    socket.destroy()
  }
  clients.clear()
  if (server) {
    server.close()
    server = null
  }
  console.log('[TCP] 服务端已停止')
}

module.exports = {
  startServer, stopServer, sendMessage,
  getConnectedClients, isConnected, disconnectClient,
  registerOutgoingConnection
}
