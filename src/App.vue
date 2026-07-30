<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDeviceStore } from '@/stores/device'
import { eventApi } from '@/utils/ipc'
import { playNotificationSound } from '@/utils/notification'

const userStore = useUserStore()
const deviceStore = useDeviceStore()

onMounted(async () => {
  await userStore.load()
  deviceStore.init()

  // [Bugfix] 全局提示音：不管当前在主页还是聊天窗口，收到消息都播放
  // 之前只在 DeviceList.vue 订阅，导致进入聊天窗口后收消息没声音
  eventApi.on('on:message-received', () => {
    playNotificationSound()
  })
})
</script>