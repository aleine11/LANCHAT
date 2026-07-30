// ===== 聊天状态管理 =====
// 存储当前聊天对象、消息列表

import { defineStore } from 'pinia'
import { chatApi, eventApi } from '@/utils/ipc'

export const useChatStore = defineStore('chat', {
  state: () => ({
    // 当前正在聊天的设备IP
    currentIp: '',
    currentName: '',
    // 消息列表（当前聊天对象）
    messages: [],
    // 取消订阅函数
    unsubscribers: [],
    // 是否已加载完所有历史
    hasMore: true,
    loading: false
  }),

  actions: {
    /**
     * 开始与某设备聊天（加载历史 + 订阅新消息）
     */
    async openChat(deviceIp, deviceName) {
      this.currentIp = deviceIp
      this.currentName = deviceName
      this.messages = []
      this.hasMore = true
      this.cleanup()

      // 加载历史
      await this.loadMore()

      // 订阅新消息
      this.unsubscribers.push(
        eventApi.on('on:message-received', (msg) => {
          if (msg.fromIp === this.currentIp) {
            this.messages.push({
              id: Date.now(),
              content: msg.content,
              contentType: msg.messageType || 'text',
              isSelf: 0,
              thumbnailPath: msg.thumbnailPath,
              imagePath: msg.imagePath,
              createdAt: msg.timestamp
            })
          }
        })
      )
    },

    /**
     * 加载更多历史
     */
    async loadMore() {
      if (!this.currentIp || !this.hasMore || this.loading) return
      this.loading = true
      const page = Math.floor(this.messages.length / 20) + 1
      const res = await chatApi.getHistory(this.currentIp, page, 20)
      if (res.code === 200) {
        // 倒序转为正序
        const newMsgs = res.data.list.map(m => ({
          id: m.id,
          content: m.content,
          contentType: m.content_type,
          isSelf: m.is_self,
          thumbnailPath: m.thumbnail_path,
          imagePath: m.image_path,
          createdAt: m.created_at
        }))
        this.messages = [...newMsgs, ...this.messages]
        this.hasMore = res.data.hasMore
      }
      this.loading = false
    },

    /**
     * 发送文字消息
     */
    async sendMessage(content) {
      if (!content.trim() || !this.currentIp) return
      const res = await chatApi.sendMessage(this.currentIp, content.trim())
      if (res.code === 200) {
        this.messages.push({
          id: Date.now(),
          content: content.trim(),
          contentType: 'text',
          isSelf: 1,
          createdAt: res.data.timestamp
        })
      }
    },

    /**
     * 发送图片
     */
    async sendImage(filePath) {
      if (!filePath || !this.currentIp) return
      const res = await chatApi.sendImage(this.currentIp, filePath)
      if (res.code === 200) {
        this.messages.push({
          id: Date.now(),
          content: res.data.messageId,
          contentType: 'image',
          isSelf: 1,
          createdAt: res.data.timestamp
        })
      }
    },

    /**
     * 关闭聊天
     */
    closeChat() {
      this.cleanup()
      this.currentIp = ''
      this.currentName = ''
      this.messages = []
      this.hasMore = true
    },

    /**
     * 清理订阅
     */
    cleanup() {
      this.unsubscribers.forEach(unsub => unsub())
      this.unsubscribers = []
    }
  }
})
