// ===== UDP 设备发现模块 =====
// 
// 负责：广播自己的存在 + 监听其他设备的广播
// 这是整个软件"看见别人"和"被别人看见"的核心
//
// 原理类比：
//   UDP 广播就像在教室里大喊"我是小明，坐在第3排！"
//   所有人都能听到，想知道谁在的人会记住你的信息
//
// 工作流程：
//   1. 启动时创建一个 UDP socket 绑定端口 5678
//   2. 开启广播模式
//   3. 每5秒向网段广播自己的信息（名称+IP+端口）
//   4. 同时监听其他设备发来的广播
//   5. 超过15秒没收到某设备的广播 → 判定离线

const dgram = require('dgram')
const { getLocalIP, getBroadcastAddress, getDeviceId } = require('../utils/netUtil')

const UDP_PORT = 5678          // 设备发现专用端口
const HEARTBEAT_INTERVAL = 5 * 1000   // 广播间隔 5秒
const OFFLINE_TIMEOUT = 15 * 1000     // 离线判定 15秒

let socket = null          // UDP socket 实例
let heartbeatTimer = null  // 广播定时器
let cleanupTimer = null    // 离线检测定时器

// 存储发现的设备信息
// key: 设备IP, value: { ip, name, hostname, deviceId, firstSeen, lastSeen, tcpPort }
let discoveredDevices = new Map()

// 外部回调：发现设备或设备离线时通知主进程
let onDeviceDiscovered = null
let onDeviceOffline = null

/**
 * 启动设备发现服务
 * @param {Object} config
 * @param {string} config.userName       - 自己的显示名称
 * @param {number} config.tcpPort        - 自己的TCP聊天端口
 * @param {Function} config.onDiscovered - 发现设备时的回调
 * @param {Function} config.onOffline    - 设备离线时的回调
 */
function startDiscovery(config = {}) {
  if (socket) {
    console.warn('[UDP] 设备发现已在运行')
    return
  }

  const userName = config.userName || getDeviceId()
  const tcpPort = config.tcpPort || 5679
  const localIP = getLocalIP()
  onDeviceDiscovered = config.onDiscovered || (() => {})
  onDeviceOffline = config.onOffline || (() => {})

  // 1. 创建 UDP socket
  socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

  // 2. 绑定端口并开启广播
  socket.bind(UDP_PORT, () => {
    socket.setBroadcast(true)
    console.log(`[UDP] 设备发现已启动，监听端口 ${UDP_PORT}，本机IP ${localIP}`)
  })

  // 3. 监听其他设备的广播
  socket.on('message', (msg, rinfo) => {
    handleIncomingMessage(msg, rinfo)
  })

  socket.on('error', (err) => {
    console.error('[UDP] 错误:', err.message)
  })

  // 4. 定时广播自己的信息
  const broadcastMsg = JSON.stringify({
    type: 'hello',
    name: userName,
    ip: localIP,
    tcpPort: tcpPort,
    hostname: require('os').hostname()
  })

  heartbeatTimer = setInterval(() => {
    if (socket) {
      const broadcastAddr = getBroadcastAddress()
      socket.send(broadcastMsg, UDP_PORT, broadcastAddr, (err) => {
        if (err) console.error('[UDP] 广播发送失败:', err.message)
      })
    }
  }, HEARTBEAT_INTERVAL)

  // 立即发送第一次广播（不等5秒）
  setTimeout(() => {
    if (socket) {
      socket.send(broadcastMsg, UDP_PORT, getBroadcastAddress(), (err) => {
        if (err) console.error('[UDP] 首次广播失败:', err.message)
      })
    }
  }, 500)

  // 5. 定时检查设备离线
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [ip, device] of discoveredDevices) {
      if (now - device.lastSeen > OFFLINE_TIMEOUT) {
        discoveredDevices.delete(ip)
        console.log(`[UDP] 设备离线: ${device.name} (${ip})`)
        onDeviceOffline({ ip, name: device.name })
      }
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 处理收到的广播消息
 */
function handleIncomingMessage(msg, rinfo) {
  try {
    const data = JSON.parse(msg.toString())
    const senderIP = rinfo.address

    // 忽略自己发的广播
    if (senderIP === getLocalIP()) return

    // 只处理 hello 类型消息
    if (data.type !== 'hello') return

    const now = Date.now()
    const isNewDevice = !discoveredDevices.has(senderIP)

    // 更新设备信息
    discoveredDevices.set(senderIP, {
      ip: senderIP,
      name: data.name,
      hostname: data.hostname,
      tcpPort: data.tcpPort || 5679,
      firstSeen: isNewDevice ? now : (discoveredDevices.get(senderIP)?.firstSeen || now),
      lastSeen: now
    })

    if (isNewDevice) {
      console.log(`[UDP] 发现新设备: ${data.name} (${senderIP})`)
      onDeviceDiscovered({
        ip: senderIP,
        name: data.name,
        hostname: data.hostname,
        tcpPort: data.tcpPort || 5679
      })
    }
  } catch (e) {
    // 非JSON消息忽略
  }
}

/**
 * 手动刷新：立即发送一次广播
 */
function refreshDiscovery() {
  if (!socket) return
  const broadcastAddr = getBroadcastAddress()
  const msg = JSON.stringify({
    type: 'hello',
    name: 'refresh',
    ip: getLocalIP(),
    tcpPort: 5679
  })
  socket.send(msg, UDP_PORT, broadcastAddr)
}

/**
 * 获取当前已发现的设备列表
 */
function getDiscoveredDevices() {
  const devices = []
  for (const [ip, info] of discoveredDevices) {
    devices.push({ ...info })
  }
  return devices
}

/**
 * 停止设备发现
 */
function stopDiscovery() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
  discoveredDevices.clear()
  console.log('[UDP] 设备发现已停止')
}

module.exports = { startDiscovery, stopDiscovery, refreshDiscovery, getDiscoveredDevices }
