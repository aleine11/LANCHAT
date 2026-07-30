// ===== 设备状态管理 =====
// 存储在线设备列表、连接状态

import { defineStore } from 'pinia'
import { deviceApi, eventApi } from '@/utils/ipc'

export const useDeviceStore = defineStore('device', {
  state: () => ({
    // 设备列表：key 为 IP
    devices: {},
    // 每个设备的连接状态
    connectionStatus: {},
    // 取消订阅的函数列表
    unsubscribers: []
  }),

  getters: {
    // 转为数组便于渲染
    deviceList: (state) => Object.values(state.devices),
    // 在线设备数量
    onlineCount: (state) => Object.keys(state.devices).length,
    // 获取某设备的连接状态
    getStatus: (state) => (ip) => state.connectionStatus[ip] || 'idle'
  },

  actions: {
    /**
     * 初始化：订阅主进程事件
     */
    init() {
      // 订阅设备发现
      this.unsubscribers.push(
        eventApi.on('on:device-discovered', (device) => {
          this.devices[device.ip] = device
        })
      )
      // 订阅设备离线
      this.unsubscribers.push(
        eventApi.on('on:device-offline', (device) => {
          delete this.devices[device.ip]
        })
      )
      // 订阅连接状态变化
      this.unsubscribers.push(
        eventApi.on('on:connection-changed', (info) => {
          this.connectionStatus[info.deviceIp] = info.status
        })
      )
    },

    /**
     * 清理订阅
     */
    cleanup() {
      this.unsubscribers.forEach(unsub => unsub())
      this.unsubscribers = []
    },

    /**
     * 主动刷新设备列表
     */
    async refresh() {
      const res = await deviceApi.refreshDiscovery()
      return res.data
    },

    /**
     * 主动连接到设备
     */
    async connect(ip, port) {
      return await deviceApi.connect(ip, port)
    }
  }
})
