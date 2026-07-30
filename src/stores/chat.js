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
     * [Bugfix] 如果是同一个聊天，不清空消息列表，避免消息"消失"
     */
    async openChat(deviceIp, deviceName) {
      const isSame = this.currentIp === deviceIp
      this.currentIp = deviceIp
      this.currentName = deviceName

      if (!isSame) {
        // 切换聊天对象：清空并加载
        this.messages = []
        this.hasMore = true
        this.cleanup()
        await this.loadMore()

        // 订阅新消息
        this.unsubscribers.push(
          eventApi.on('on:message-received', (msg) => {
            if (msg.fromIp === this.currentIp) {
              // [Bugfix] 检查是否已存在（防重复）
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
            }
          })
        )
      }
    },

    /**
     * 加载更多历史
     * [Bugfix] page=1 加载最新消息
     */
    async loadMore() {
      if (!this.currentIp || !this.hasMore || this.loading) return
      this.loading = true
      // 第一次加载：page=1 拿最新的 50 条
      // 后续加载：page=2 拿倒数第二新的，依此类推
      const page = this.messages.length === 0 ? 1 : Math.floor(this.messages.length / 20) + 1
      const pageSize = page === 1 ? 50 : 20
      const res = await chatApi.getHistory(this.currentIp, page, pageSize)
      if (res.code === 200) {
        const newMsgs = res.data.list.map(m => ({
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
        if (page === 1) {
          // 首次：直接设置
          this.messages = newMsgs
        } else {
          // 加载更早的：在前面拼接
          this.messages = [...newMsgs, ...this.messages]
        }
        this.hasMore = res.data.hasMore
      }
      this.loading = false
    },

    /**
     * 重新加载当前聊天的全部消息（重试用）
     */
    async refresh() {
      if (!this.currentIp) return
      this.loading = true
      const res = await chatApi.getHistory(this.currentIp, 1, 200)
      if (res.code === 200) {
        this.messages = res.data.list.map(m => ({
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
        this.hasMore = res.data.hasMore
      }
      this.loading = false
    },

    /**
     * 发送文字消息
     * [Bugfix] 始终先添加到 UI + DB，TCP 失败不丢失
     */
    async sendMessage(content) {
      if (!content.trim() || !this.currentIp) return
      const res = await chatApi.sendMessage(this.currentIp, content.trim())
      if (res.code === 200 && res.data.messageId) {
        // 检查是否已存在（防止双击重复）
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
          // 已存在则更新状态
          const idx = this.messages.findIndex(m => m.messageId === res.data.messageId)
          if (idx >= 0) this.messages[idx].status = res.data.status
        }
      }
    },

    /**
     * 发送图片
     */
    async sendImage(filePath) {
      if (!filePath || !this.currentIp) return
      const res = await chatApi.sendImage(this.currentIp, filePath)
      if (res.code === 200 && res.data.messageId) {
        if (!this.messages.find(m => m.messageId === res.data.messageId)) {
          this.messages.push({
            id: res.data.messageId,
            content: '',
            contentType: 'image',
            isSelf: 1,
            status: res.data.status || 'sent',
            imagePath: filePath.startsWith('data:') ? '' : filePath,
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
     * [Bugfix] 删除消息
     */
    async deleteMessage(messageId) {
      const res = await chatApi.deleteMessage(messageId)
      if (res.code === 200) {
        // 从本地列表移除
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
