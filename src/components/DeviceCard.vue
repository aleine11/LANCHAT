<template>
  <!-- 单个设备卡片（LocalSend 风格） -->
  <div class="device-card" @click="$emit('chat', device)">
    <span class="device-status"></span>
    <div class="device-icon">
      {{ deviceIcon }}
    </div>
    <div class="device-name" :title="device.name">{{ device.name }}</div>
    <span class="device-action">开始聊天</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  device: { type: Object, required: true }
})

defineEmits(['chat'])

// 随机设备图标
const icons = ['💻', '🖥️', '📱', '🖨️', '📡', '🖥️']
const deviceIcon = computed(() => {
  const hash = props.device.ip.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return icons[hash % icons.length]
})
</script>

<style scoped>
.device-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  box-shadow: var(--box-shadow);
  cursor: pointer;
  transition: all .25s;
  border: 2px solid transparent;
  position: relative;
}
.device-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--box-shadow-hover);
  border-color: #66B1FF;
}
.device-card:active { transform: translateY(-1px); }
.device-status {
  position: absolute; top: 12px; right: 12px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #67C23A;
  box-shadow: 0 0 8px rgba(103,194,58,.4);
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .6; transform: scale(1.3); }
}
.device-icon {
  width: 56px; height: 56px;
  margin: 0 auto 12px;
  background: var(--color-primary-bg);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}
.device-name {
  font-size: 15px; font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.device-action {
  display: inline-block;
  padding: 6px 18px;
  background: var(--color-primary-bg);
  color: #409EFF;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  transition: all .2s;
}
.device-card:hover .device-action {
  background: #409EFF;
  color: white;
}
</style>
