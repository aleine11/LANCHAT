// ===== TCP 聊天客户端 =====
//
// 负责：主动连接其他设备，建立聊天通道
// 当用户在设备列表点击"开始聊天"时，调用此模块连接对方
//
// 成功连接后，把 socket 注册到 server.js 统一管理

const net = require('net')
const { registerOutgoingConnection } = require('./server')

/**
 * 连接指定设备
 *
 * @param {string} targetIP   - 对方IP地址
 * @param {number} targetPort - 对方TCP端口（默认5679）
 * @param {number} timeout    - 连接超时时间（毫秒，默认5000）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
function connectToDevice(targetIP, targetPort = 5679, timeout = 5000) {
  return new Promise((resolve) => {
    console.log(`[TCP Client] 正在连接 ${targetIP}:${targetPort}...`)

    const socket = new net.Socket()
    socket.setTimeout(timeout)

    socket.connect(targetPort, targetIP, () => {
      console.log(`[TCP Client] 已连接到 ${targetIP}:${targetPort}`)
      socket.setTimeout(0)
      // 把这个主动连出去的 socket 注册到 server 统一管理
      registerOutgoingConnection(socket, targetIP)
      resolve({ success: true })
    })

    socket.on('timeout', () => {
      console.error(`[TCP Client] 连接超时: ${targetIP}`)
      socket.destroy()
      resolve({ success: false, message: '连接超时：对方可能不在线或防火墙阻止了连接' })
    })

    socket.on('error', (err) => {
      console.error(`[TCP Client] 连接错误 (${targetIP}):`, err.message)
      socket.destroy()
      resolve({ success: false, message: `连接失败: ${err.message}` })
    })
  })
}

module.exports = { connectToDevice }
