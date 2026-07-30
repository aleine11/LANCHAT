<template>
  <!-- 聊天窗口（微信风格） -->
  <div class="chat-page">
    <!-- [Bugfix] 统一标题栏：和主页一样可拖拽 -->
    <TitleBar @refresh="reconnect">
      <template #left>
        <button class="back-btn" @click="goBack">←</button>
        <span class="chat-name">{{ chatStore.currentName || '对方' }}</span>
        <span :class="['status-dot', connected ? 'online' : (connecting ? 'connecting' : 'offline')]"></span>
        <span class="status-text" :class="!connected ? 'offline' : ''">
          {{ connected ? '在线' : (connecting ? '连接中...' : '未连接') }}
        </span>
        <span class="chat-ip">· {{ chatStore.currentIp }}</span>
      </template>
    </TitleBar>

    <!-- [Bugfix] 断联提示横幅 - 仍可聊天 -->
    <div v-if="!connected" class="offline-banner">
      <span class="banner-icon">{{ connecting ? '🔄' : '⚠️' }}</span>
      <span class="banner-text">
        {{ connecting ? '正在连接...消息将在连接成功后发送' : '对方已离线，你可以继续输入消息，重连后自动发送' }}
      </span>
      <span v-if="pendingCount > 0" class="pending-badge">{{ pendingCount }}条待发送</span>
    </div>

    <!-- 消息列表 -->
    <div class="messages-area" ref="msgAreaRef">
      <div v-if="chatStore.messages.length === 0" class="empty-chat">
        <div class="empty-icon">💬</div>
        <div>开始聊天吧！发送第一条消息打个招呼~</div>
      </div>
      <transition-group name="msg" v-else>
        <MessageBubble
          v-for="msg in chatStore.messages"
          :key="msg.id || msg.messageId"
          :msg="msg"
          :fromName="chatStore.currentName"
          @preview="previewMsg = msg"
          @delete="onDelete"
        />
      </transition-group>
    </div>

    <!-- [Bugfix] 始终允许输入，断联时消息存库待重发 -->
    <ChatInput @send="onSend" @sendImage="onSendImage" />

    <!-- 图片预览 -->
    <ImagePreview v-if="previewMsg" :msg="previewMsg" @close="previewMsg = null" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useDeviceStore } from '@/stores/device'
import { eventApi } from '@/utils/ipc'

import MessageBubble from '@/components/MessageBubble.vue'
import ChatInput from '@/components/ChatInput.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import TitleBar from '@/components/TitleBar.vue'

const router = useRouter()
const chatStore = useChatStore()
const deviceStore = useDeviceStore()

const msgAreaRef = ref(null)
const previewMsg = ref(null)
const status = computed(() => deviceStore.getStatus(chatStore.currentIp))
const connected = computed(() => status.value === 'connected')
const connecting = computed(() => status.value === 'connecting')
// [Bugfix] 待发送消息数
const pendingCount = computed(() => {
  return chatStore.messages.filter(m => m.isSelf && (m.status === 'pending' || m.status === 'failed')).length
})

let unsub = null
unsub = eventApi.on('on:connection-changed', (info) => {
  if (info.deviceIp === chatStore.currentIp) {
    // reactivity handled by deviceStore
  }
})
onUnmounted(() => { if (unsub) unsub() })

// 自动滚到底部
watch(() => chatStore.messages.length, () => {
  nextTick(() => {
    if (msgAreaRef.value) {
      msgAreaRef.value.scrollTop = msgAreaRef.value.scrollHeight
    }
  })
})

function goBack() {
  chatStore.closeChat()
  router.push('/')
}

async function onSend(content) {
  await chatStore.sendMessage(content)
}

async function onSendImage(fileOrPath) {
  if (typeof fileOrPath === 'string') {
    await chatStore.sendImage(fileOrPath)
  }
}

// [Bugfix] 删除消息
async function onDelete(msg) {
  if (!confirm('确认删除这条消息？')) return
  await chatStore.deleteMessage(msg.messageId)
}

async function reconnect() {
  if (!chatStore.currentIp) return
  await deviceStore.connect(chatStore.currentIp, 5679)
}

// [Bugfix] 标题栏统一后，minWindow/closeWindow 由 TitleBar 组件处理
// 移除冗余函数


// [Bugfix] 监听重试完成，刷新消息状态
const retryUnsub = eventApi.on('on:retry-completed', async (info) => {
  if (info.deviceIp === chatStore.currentIp && info.retried > 0) {
    await chatStore.refresh()
  }
})
onUnmounted(() => { if (retryUnsub) retryUnsub() })
</script>

<style scoped>
.chat-page {
  height: 100%;
  display: flex; flex-direction: column;
  background: #F0F3F7;
}
/* [Bugfix] 聊天窗口标题栏内嵌样式 - 蓝色背景白色文字 */
:deep(.titlebar) { padding-left: 0; }
.back-btn {
  width: 32px; height: 32px; border-radius: 6px;
  border: none; background: rgba(255,255,255,.15);
  font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: white; transition: .15s;
}
.back-btn:hover { background: rgba(255,255,255,.3); }
.chat-name {
  font-size: 15px; font-weight: 600;
  color: white; margin-left: 8px;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; }
.status-dot.online { background: #67C23A; animation: pulse 2s ease-in-out infinite; box-shadow: 0 0 4px rgba(255,255,255,.5); }
.status-dot.offline { background: #C0C4CC; }
.status-dot.connecting { background: #E6A23C; animation: pulse .8s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .6; transform: scale(1.3); }
}
.status-text { font-size: 12px; color: rgba(255,255,255,.9); }
.status-text.offline { color: rgba(255,255,255,.6) !important; }
.chat-ip { font-size: 12px; color: rgba(255,255,255,.6); margin-left: 4px; }
/* 消息区 */
.messages-area {
  flex: 1; overflow-y: auto;
  padding: 20px;
}
.empty-chat {
  text-align: center; padding: 80px 40px;
  color: #909399; font-size: 14px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.reconnect-btn {
  margin-top: 16px;
  padding: 8px 20px;
  background: #409EFF; color: white;
  border: none; border-radius: 20px;
  font-size: 14px; cursor: pointer;
  transition: all .2s;
}
.reconnect-btn:hover { background: #3A8EE6; }
.status-dot.connecting { background: #E6A23C; animation: pulse .8s ease-in-out infinite; }
.status-text.offline { color: #909399 !important; }

/* [Bugfix] 断联横幅 - 替代阻断页 */
.offline-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: #FFF7E6;
  color: #B88230;
  font-size: 12px;
  border-bottom: 1px solid #F5E6BF;
  flex-shrink: 0;
}
.banner-icon { font-size: 14px; }
.banner-text { flex: 1; }
.pending-badge {
  background: #E6A23C; color: white;
  padding: 2px 8px; border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
/* 消息入场动画 */
.msg-enter-active { transition: all .3s ease; }
.msg-enter-from { opacity: 0; transform: translateY(10px); }
/* 滚动条 */
.messages-area::-webkit-scrollbar { width: 5px; }
.messages-area::-webkit-scrollbar-track { background: transparent; }
.messages-area::-webkit-scrollbar-thumb { background: #d0d5dd; border-radius: 3px; }
</style>
