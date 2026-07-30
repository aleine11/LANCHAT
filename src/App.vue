<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDeviceStore } from '@/stores/device'

const userStore = useUserStore()
const deviceStore = useDeviceStore()

onMounted(async () => {
  // 加载用户信息
  await userStore.load()
  // 初始化设备事件订阅（M3 → M4 联动）
  deviceStore.init()
})
</script>
