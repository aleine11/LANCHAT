// ===== 用户状态管理 =====
// 存储当前用户的名称、IP 等

import { defineStore } from 'pinia'
import { userApi } from '@/utils/ipc'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    ip: '',
    loading: false
  }),

  actions: {
    /**
     * 加载用户信息（从主进程读取）
     */
    async load() {
      this.loading = true
      try {
        const res = await userApi.getName()
        if (res.code === 200) {
          this.name = res.data.name
          this.ip = res.data.ip
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * 修改名称
     */
    async updateName(name) {
      const res = await userApi.setName(name)
      if (res.code === 200) {
        this.name = name
        return { success: true }
      }
      return { success: false, message: res.message }
    }
  }
})
