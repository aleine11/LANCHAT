<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDeviceStore } from '@/stores/device'
import { eventApi, configApi } from '@/utils/ipc'
import { playNotificationSound } from '@/utils/notification'

const userStore = useUserStore()
const deviceStore = useDeviceStore()

onMounted(async () => {
  await userStore.load()
  deviceStore.init()

  // 初始化主题（从数据库读取，默认浅色）
  try {
    const res = await configApi.getAll()
    if (res.code === 200 && res.data) {
      const theme = res.data.theme || 'light'
      document.documentElement.setAttribute('data-theme', theme)
    }
  } catch (e) {
    // 默认浅色模式
  }

  // 全局提示音：不管当前在主页还是聊天窗口，收到消息都播放
  eventApi.on('on:message-received', () => {
    playNotificationSound()
  })
})
</script>