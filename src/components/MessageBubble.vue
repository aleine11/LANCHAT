<template>
  <!-- 单条消息气泡 -->
  <!-- message.isSelf: 0=对方(左对齐灰色), 1=自己(右对齐蓝色) -->
  <div :class="['msg-row', msg.isSelf ? 'self' : 'other']">
    <div class="msg-avatar" :title="msg.isSelf ? '我' : fromName">
      {{ msg.isSelf ? '🖥️' : '💻' }}
    </div>
    <div class="msg-content">
      <!-- 文字消息 -->
      <div v-if="msg.contentType === 'text'" class="bubble">
        {{ msg.content }}
      </div>
      <!-- 图片消息 -->
      <div
        v-else-if="msg.contentType === 'image'"
        class="bubble bubble-image"
        @click="$emit('preview', msg)"
      >
        <div class="img-placeholder">
          <span class="img-icon">🖼️</span>
          <span class="img-label">点击查看大图</span>
        </div>
      </div>
      <!-- 时间 -->
      <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  msg: { type: Object, required: true },
  fromName: { type: String, default: '' }
})
defineEmits(['preview'])

function formatTime(timeStr) {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.msg-row {
  display: flex; gap: 8px; margin-bottom: 10px;
  animation: msgIn .3s ease;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.msg-row.self { justify-content: flex-end; }
.msg-row.other { justify-content: flex-start; }
.msg-avatar {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.msg-row.other .msg-avatar { background: #E8F4FD; }
.msg-row.self .msg-avatar { background: #ECF5FF; }
.msg-row.self .msg-avatar { order: 2; }
.msg-content { max-width: 55%; }
.msg-row.self .msg-content { text-align: right; }
.bubble {
  display: inline-block;
  padding: 10px 14px; border-radius: 12px;
  font-size: 14px; line-height: 1.5;
  word-break: break-all;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.msg-row.other .bubble {
  background: white; color: #303133;
  border-top-left-radius: 2px;
}
.msg-row.self .bubble {
  background: #409EFF; color: white;
  border-top-right-radius: 2px;
}
.bubble-image {
  padding: 4px; cursor: pointer; transition: transform .2s;
  max-width: 220px;
}
.bubble-image:hover { transform: scale(1.02); }
.img-placeholder {
  width: 200px; height: 140px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px;
}
.img-icon { font-size: 36px; }
.img-label { font-size: 12px; color: rgba(255,255,255,.7); }
.msg-time {
  font-size: 11px; color: #C0C4CC;
  margin-top: 2px;
  padding: 0 4px;
}
</style>
