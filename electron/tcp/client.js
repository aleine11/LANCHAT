// ===== TCP 聊天客户端 =====
//
// 负责：主动连接其他设备，建立聊天通道
// 当用户在设备列表点击"开始聊天"时，调用此模块连接对方
//
// 原理类比：
//   服务端（server.js）= 在家门口挂信箱，等别人投信
//   客户端（client.js）= 主动走到别人家门口，往信箱里投信
//   连接建立后，双方都能收发消息

const net = require('net')

/**
 * 连接指定设备
 * 
 * 返回的 socket 对象可以用于发送消息
 * 消息格式和 server.js 保持一致：JSON + '\n' 分隔符
 *
 * @param {string} targetIP   - 对方IP地址
 * @param {number} targetPort - 对方TCP端口（默认5679）
 * @param {number} timeout    - 连接超时时间（毫秒，默认5000）
 * @returns {Promise<net.Socket>} 成功返回 socket，失败抛出错误
 */
function connectToDevice(targetIP, targetPort = 5679, timeout = 5000) {
  return new Promise((resolve, reject) => {
    console.log(`[TCP Client] 正在连接 ${targetIP}:${targetPort}...`)

    const socket = new net.Socket()

    // 设置连接超时
    socket.setTimeout(timeout)

    socket.connect(targetPort, targetIP, () => {
      console.log(`[TCP Client] 已连接到 ${targetIP}:${targetPort}`)
      socket.setTimeout(0) // 取消超时
      resolve(socket)
    })

    socket.on('timeout', () => {
      console.error(`[TCP Client] 连接超时: ${targetIP}`)
      socket.destroy()
      reject(new Error('连接超时：对方可能不在线或防火墙阻止了连接'))
    })

    socket.on('error', (err) => {
      console.error(`[TCP Client] 连接错误 (${targetIP}):`, err.message)
      socket.destroy()
      reject(new Error(`连接失败: ${err.message}`))
    })
  })
}

module.exports = { connectToDevice }
