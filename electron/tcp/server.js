// ===== TCP 聊天服务端 =====
//
// 负责：监听本机 5679 端口，接收其他设备发起的聊天连接
// 每台运行 LanChat 的电脑都同时运行这个服务端
// 
// 原理类比：
//   TCP 服务端就像在家门口挂个信箱（5679号信箱）
//   别人想跟你聊天，就往这个信箱里投信
//   你随时可以查看信箱里的信，也可以回信
//
// TCP vs UDP 的区别：
//   UDP = 大喇叭广播，谁都能听到，但不保证对方一定听到
//   TCP = 打电话，两个人之间拉一条专线，保证消息送到

const net = require('net')

const TCP_PORT = 5679
let server = null
let clients = new Map()  // key: 对方IP, value: socket连接

// 外部回调：收到消息时通知
let onMessageReceived = null
let onConnectionChanged = null

/**
 * 启动 TCP 服务端
 * @param {Object} callbacks
 * @param {Function} callbacks.onMessage - 收到消息时的回调 (msgData)
 * @param {Function} callbacks.onConnection - 连接状态变化时的回调 ({ deviceIp, status })
 */
function startServer(callbacks = {}) {
  if (server) {
    console.warn('[TCP] 服务端已在运行')
    return
  }

  onMessageReceived = callbacks.onMessage || (() => {})
  onConnectionChanged = callbacks.onConnection || (() => {})

  server = net.createServer((socket) => {
    const remoteIP = socket.remoteAddress.replace(/^::ffff:/, '') // 去掉 IPv6 前缀
    console.log(`[TCP] 收到连接: ${remoteIP}`)

    // 如果已有同IP的连接，先关闭旧的
    if (clients.has(remoteIP)) {
      clients.get(remoteIP).destroy()
    }
    clients.set(remoteIP, socket)

    onConnectionChanged({ deviceIp: remoteIP, status: 'connected' })

    // 数据缓冲区：TCP 是流式传输，可能一次收到半条消息
    let buffer = ''

    // 接收数据
    socket.on('data', (data) => {
      buffer += data.toString()

      // TCP 消息分隔符：每条 JSON 消息以换行符 \n 结尾
      // 这样可以在一条 TCP 连接上发送多条消息
      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const messageStr = buffer.substring(0, newlineIndex)
        buffer = buffer.substring(newlineIndex + 1)

        try {
          const msg = JSON.parse(messageStr)
          // 补充发送方IP（从连接信息获取，而不是信任消息内容）
          msg.fromIp = remoteIP
          onMessageReceived(msg)
        } catch (e) {
          console.error('[TCP] 消息解析失败:', messageStr.substring(0, 100))
        }
      }
    })

    // 连接关闭
    socket.on('close', () => {
      console.log(`[TCP] 连接关闭: ${remoteIP}`)
      clients.delete(remoteIP)
      onConnectionChanged({ deviceIp: remoteIP, status: 'disconnected' })
    })

    // 连接错误
    socket.on('error', (err) => {
      console.error(`[TCP] 连接错误 (${remoteIP}):`, err.message)
      clients.delete(remoteIP)
      onConnectionChanged({ deviceIp: remoteIP, status: 'error', message: err.message })
    })
  })

  server.listen(TCP_PORT, () => {
    console.log(`[TCP] 服务端已启动，监听端口 ${TCP_PORT}`)
  })

  server.on('error', (err) => {
    console.error('[TCP] 服务端错误:', err.message)
    onConnectionChanged({ status: 'error', message: `TCP服务端启动失败: ${err.message}` })
  })
}

/**
 * 向指定设备发送消息（通过已有的TCP连接）
 * @param {string} deviceIp - 对方IP
 * @param {Object} message - 消息对象
 * @returns {boolean} 发送成功返回 true
 */
function sendMessage(deviceIp, message) {
  const socket = clients.get(deviceIp)
  if (!socket || socket.destroyed) {
    console.error(`[TCP] 无法发送: 未连接到 ${deviceIp}`)
    return false
  }
  // 每条消息以换行符结尾，作为消息分隔符
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
    if (!socket.destroyed) {
      list.push(ip)
    }
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

module.exports = { startServer, stopServer, sendMessage, getConnectedClients, isConnected, disconnectClient }
