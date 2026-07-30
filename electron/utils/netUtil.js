// ===== 网络工具函数 =====
// 提供本机IP获取等通用网络功能

const os = require('os')

/**
 * 获取本机局域网 IP 地址
 * 优先获取 IPv4 地址，排除回环地址 127.0.0.1
 *
 * 为什么需要这个？
 *   局域网通信必须知道自己的 IP，对方才能连过来
 *   相当于要知道自己家的门牌号，别人才能找到你
 *
 * @returns {string} 本机IP地址，找不到则返回 '127.0.0.1'
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部回环地址 127.0.0.1 和 IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

/**
 * 获取广播地址
 * 局域网广播通常用网段的最后一个地址，例如 192.168.1.255
 *
 * @returns {string} 广播地址
 */
function getBroadcastAddress() {
  const ip = getLocalIP()
  const parts = ip.split('.')
  parts[3] = '255'
  return parts.join('.')
}

/**
 * 生成唯一设备ID
 * 用主机名 + 随机字符串组合，同一台电脑多次重启也能区分
 */
function getDeviceId() {
  return os.hostname() + '-' + Math.random().toString(36).substring(2, 8)
}

module.exports = { getLocalIP, getBroadcastAddress, getDeviceId }
