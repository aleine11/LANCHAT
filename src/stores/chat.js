// ===== 聊天状态管理 =====
// 存储当前聊天对象、消息列表
// [重构] 去掉分页：本地聊天消息量有限（几百条），全部加载最简单可靠

import { defineStore } from 'pinia'
import { chatApi, eventApi } from '@/utils/ipc'

export const useChatStore = defineStore('chat', {
  state: () => ({
    currentIp: '',
    currentName: '',
    messages: [],
    unsubscribers: [],
    loading: false
  }),

  actions: {
    /**
     * 开始与某设备聊天 — 全量加载 + 订阅新消息
     */
    async openChat(deviceIp, deviceName) {
      const isSame = this.currentIp === deviceIp
      this.currentIp = deviceIp
      this.currentName = deviceName

      if (!isSame) {
        this.messages = []
        this.cleanup()
        await this._loadAllMessages()

        // 订阅对方发来的新消息（实时推送到消息列表）
        this.unsubscribers.push(
          eventApi.on('on:message-received', (msg) => {
            if (msg.fromIp !== this.currentIp) return
            if (this.messages.find(m => m.messageId === msg.messageId)) return
            this.messages.push({
              id: Date.now() + Math.random(),
              content: msg.content,
              contentType: msg.messageType || 'text',
              isSelf: 0,
              thumbnailPath: msg.thumbnailPath,
              imagePath: msg.imagePath,
              imageSize: msg.imageSize,
              status: 'sent',
              messageId: msg.messageId,
              createdAt: msg.timestamp
            })
          })
        )
      }
    },

    /**
     * 从数据库全量加载当前聊天的全部消息
     */
    async _loadAllMessages() {
      if (!this.currentIp || this.loading) return
      this.loading = true
      const res = await chatApi.getAllMessages(this.currentIp)
      if (res.code === 200) {
        this.messages = (res.data.list || []).map(m => ({
          id: m.id,
          content: m.content,
          contentType: m.content_type,
          isSelf: m.is_self,
          thumbnailPath: m.thumbnail_path,
          imagePath: m.image_path,
          imageSize: m.image_size,
          status: m.status || 'sent',
          messageId: m.message_id,
          createdAt: m.created_at
        }))
      }
      this.loading = false
    },

    /**
     * 重新加载消息（重试/刷新时调用）
     */
    async refresh() {
      await this._loadAllMessages()
    },

    /**
     * 发送文字消息
     */
    async sendMessage(content) {
      if (!content.trim() || !this.currentIp) return
      const res = await chatApi.sendMessage(this.currentIp, content.trim())
      if (res.code === 200 && res.data.messageId) {
        if (!this.messages.find(m => m.messageId === res.data.messageId)) {
          this.messages.push({
            id: res.data.messageId,
            content: content.trim(),
            contentType: 'text',
            isSelf: 1,
            status: res.data.status || 'sent',
            messageId: res.data.messageId,
            createdAt: res.data.timestamp
          })
        } else {
          const idx = this.messages.findIndex(m => m.messageId === res.data.messageId)
          if (idx >= 0) this.messages[idx].status = res.data.status
        }
      }
    },

    /**
     * 发送图片
     * [Bugfix] 使用后端返回的 relPath（图片在 userData 下的相对路径），
     *           而不是用户的原始本地路径或空字符串
     */
    async sendImage(filePath) {
      if (!filePath || !this.currentIp) return
      const res = await chatApi.sendImage(this.currentIp, filePath)
      if (res.code === 200 && res.data.messageId) {
        const relPath = res.data.relPath || ''
        if (!this.messages.find(m => m.messageId === res.data.messageId)) {
          this.messages.push({
            id: res.data.messageId,
            content: '',
            contentType: 'image',
            isSelf: 1,
            status: res.data.status || 'sent',
            imagePath: relPath,
            messageId: res.data.messageId,
            createdAt: res.data.timestamp
          })
        } else {
          const idx = this.messages.findIndex(m => m.messageId === res.data.messageId)
          if (idx >= 0) this.messages[idx].status = res.data.status
        }
      }
    },

    /**
     * 删除消息
     */
    async deleteMessage(messageId) {
      const res = await chatApi.deleteMessage(messageId)
      if (res.code === 200) {
        this.messages = this.messages.filter(m => m.messageId !== messageId)
      }
      return res
    },

    /**
     * 关闭聊天
     */
    closeChat() {
      this.cleanup()
      this.currentIp = ''
      this.currentName = ''
      this.messages = []
      this.loading = false
    },

    /**
     * 清理事件订阅
     */
    cleanup() {
      this.unsubscribers.forEach(unsub => unsub())
      this.unsubscribers = []
    }
  }
})
