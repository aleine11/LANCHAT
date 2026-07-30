<template>
  <!-- 我的设备信息卡片 -->
  <div class="my-card">
    <div class="my-avatar">🖥️</div>
    <div class="my-info">
      <div class="my-name">{{ userStore.name }}</div>
      <div class="my-ip">📡 {{ userStore.ip }} : 5679</div>
      <div class="my-stats">
        <span class="status-dot"></span>
        <span>在线</span>
        <span class="sep">|</span>
        <span>已发现 <strong>{{ deviceStore.onlineCount }}</strong> 台设备</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { useDeviceStore } from '@/stores/device'

const userStore = useUserStore()
const deviceStore = useDeviceStore()
</script>

<style scoped>
.my-card {
  background: linear-gradient(135deg, #409EFF, #3A8EE6);
  border-radius: 14px;
  padding: 20px 24px;
  color: white;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(64,158,255,.3);
}
.my-avatar {
  width: 52px; height: 52px;
  background: rgba(255,255,255,.2);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.my-info { flex: 1; }
.my-name { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
.my-ip { font-size: 13px; opacity: .85; font-family: 'Courier New', monospace; }
.my-stats {
  display: flex; align-items: center; gap: 6px;
  margin-top: 6px; font-size: 13px; opacity: .9;
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #67C23A;
  animation: dotPulse 2s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(103,194,58,.5);
}
.sep { opacity: .5; }
@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .6; transform: scale(1.3); }
}
</style>
