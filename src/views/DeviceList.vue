<template>
  <!--
    设备列表主界面（LocalSend 风格）
    布局：标题栏 → 我的设备卡片 → 设备网格 → 空状态
  -->
  <div class="device-page">
    <!-- 自定义标题栏 -->
    <TitleBar @refresh="refreshAll">
      <template #left>
        <span class="titlebar-logo">💬</span>
        <span class="titlebar-title">LanChat</span>
      </template>
    </TitleBar>

    <!-- 内容区 -->
    <div class="content">
      <!-- 我的设备 -->
      <MyDeviceCard />

      <!-- 最近联系人 -->
      <div v-if="recentList.length > 0" class="section">
        <div class="section-header">
          <span class="section-title">🕐 最近联系人</span>
        </div>
        <div class="recent-list">
          <div
            v-for="contact in recentList"
            :key="contact.device_ip"
            class="recent-item"
            @click="openChat(contact)"
          >
            <div class="recent-avatar">💻</div>
            <div class="recent-info">
              <div class="recent-name">{{ contact.device_name }}</div>
              <div class="recent-msg">{{ contact.last_message || '开始聊天' }}</div>
            </div>
            <div class="recent-time">{{ formatTime(contact.last_message_time) }}</div>
            <span v-if="contact.unread_count > 0" class="recent-badge">
              {{ contact.unread_count > 99 ? '99+' : contact.unread_count }}
            </span>
          </div>
        </div>
      </div>

      <!-- 在线设备 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">📡 在线设备</span>
          <div class="section-actions">
            <button class="refresh-btn" title="刷新设备列表" @click="refreshDevices">
              <span :class="['refresh-icon', { spinning: refreshing }]">🔄</span>
            </button>
            <span class="section-count">{{ deviceStore.onlineCount }} 台在线</span>
          </div>
        </div>

        <!-- 设备卡片网格 -->
        <div v-if="deviceStore.onlineCount > 0" class="device-grid">
          <DeviceCard
            v-for="device in deviceStore.deviceList"
            :key="device.ip"
            :device="device"
            @chat="openChat"
          />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else
          :scanning="scanning"
          @refresh="refreshDevices"
        />
      </div>
    </div>

    <!-- 设置弹窗 -->
    <SettingsDialog v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { useChatStore } from '@/stores/chat'
import { chatApi, eventApi } from '@/utils/ipc'

import TitleBar from '@/components/TitleBar.vue'
import MyDeviceCard from '@/components/MyDeviceCard.vue'
import DeviceCard from '@/components/DeviceCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'

const router = useRouter()
const deviceStore = useDeviceStore()
const chatStore = useChatStore()

const showSettings = ref(false)
const scanning = ref(true)
const refreshing = ref(false)
const recentList = ref([])
let scanTimer = null
let refreshTimer = null

// 提示音（Web Audio API 简单蜂鸣）
let audioCtx = null
function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2)
    osc.stop(audioCtx.currentTime + 0.2)
  } catch (e) { /* 静默忽略 */ }
}

onMounted(async () => {
  loadRecentContacts()
  // 每 5 秒自动刷新最近联系人
  refreshTimer = setInterval(loadRecentContacts, 5000)

  scanTimer = setTimeout(() => { scanning.value = false }, 10000)
  const unsub = eventApi.on('on:device-discovered', () => {
    scanning.value = false
    if (scanTimer) clearTimeout(scanTimer)
  })
  // 收到新消息时刷新联系人 + 播放提示音
  const msgUnsub = eventApi.on('on:message-received', () => {
    loadRecentContacts()
    playNotificationSound()
  })
  onUnmounted(() => { unsub(); msgUnsub(); })
})

onUnmounted(() => {
  if (scanTimer) clearTimeout(scanTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})

// 加载最近联系人
async function loadRecentContacts() {
  const res = await chatApi.getRecentContacts()
  if (res.code === 200) {
    recentList.value = res.data.list || []
  }
}

// 点击设备 → 主动建立TCP连接 → 打开聊天
// [优化] TCP连接不阻塞跳转，连接过程在后台进行
function openChat(device) {
  const ip = device.device_ip || device.ip
  const name = device.device_name || device.name
  chatStore.openChat(ip, name)
  router.push({ name: 'ChatWindow', params: { ip } })
  // 后台尝试建立TCP连接（不等结果）
  deviceStore.connect(ip, 5679).catch(() => { /* 静默失败 */ })
}

// 刷新设备列表
async function refreshDevices() {
  refreshing.value = true
  await deviceStore.refresh()
  loadRecentContacts()
  scanning.value = false
  setTimeout(() => { refreshing.value = false }, 800)
}

// 标题栏的全局刷新
async function refreshAll() {
  await refreshDevices()
  playNotificationSound()
}

// 时间格式化
function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.device-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F0F3F7;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
/* 区域标题 */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.section-title {
  font-size: 14px; font-weight: 600; color: #606266;
  display: flex; align-items: center; gap: 8px;
}
.section-actions { display: flex; align-items: center; gap: 8px; }
.section-count {
  font-size: 12px; color: #909399;
  background: #EBEEF5;
  padding: 2px 10px; border-radius: 10px;
}
.refresh-btn {
  width: 28px; height: 28px;
  border: 1px solid #EBEEF5; background: white;
  border-radius: 8px; font-size: 14px; cursor: pointer;
  color: #909399;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.refresh-btn:hover { background: #ECF5FF; color: #409EFF; border-color: #66B1FF; }
.refresh-btn:active { transform: scale(.9); }
.refresh-icon.spinning { animation: spin .8s ease-in-out; display: inline-block; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
/* 设备网格 */
.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}
/* 最近联系人 */
.recent-list {
  display: flex; flex-direction: column; gap: 8px;
}
.recent-item {
  display: flex; align-items: center; gap: 12px;
  background: white; padding: 14px 16px; border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  transition: all .2s;
}
.recent-item:hover { background: #ECF5FF; }
.recent-avatar {
  width: 40px; height: 40px; background: #E8F4FD;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.recent-info { flex: 1; min-width: 0; }
.recent-name { font-size: 14px; font-weight: 600; }
.recent-msg {
  font-size: 12px; color: #909399;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 2px;
}
.recent-time { font-size: 11px; color: #C0C4CC; flex-shrink: 0; }
.recent-badge {
  background: #F56C6C; color: white;
  font-size: 11px; min-width: 18px; height: 18px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px;
}
/* 滚动条 */
.content::-webkit-scrollbar { width: 5px; }
.content::-webkit-scrollbar-track { background: transparent; }
.content::-webkit-scrollbar-thumb { background: #d0d5dd; border-radius: 3px; }
</style>
