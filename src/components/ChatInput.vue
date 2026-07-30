<template>
  <!-- 聊天输入栏 -->
  <div class="input-area">
    <div class="input-toolbar">
      <span class="hint-text">回车发送 · Shift+回车换行 · Ctrl+V 粘贴图片</span>
    </div>
    <div class="input-row">
      <textarea
        ref="inputRef"
        class="input-box"
        v-model="text"
        placeholder="输入消息..."
        rows="1"
        @keydown="onKeydown"
        @paste="onPaste"
      ></textarea>
      <button class="send-btn" @click="send" :disabled="!text.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send', 'sendImage'])
const text = ref('')
const inputRef = ref(null)

function send() {
  if (!text.value.trim()) return
  emit('send', text.value.trim())
  text.value = ''
  // 重置高度
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function onPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file && file.size < 20 * 1024 * 1024) {
        emit('sendImage', file)
        return
      }
    }
  }
}
</script>

<style scoped>
.input-area {
  background: white;
  border-top: 1px solid #EBEEF5;
  padding: 12px 16px;
  flex-shrink: 0;
}
.input-toolbar {
  margin-bottom: 8px;
}
.hint-text {
  font-size: 11px; color: #C0C4CC;
  padding: 4px 0;
}
.input-row { display: flex; gap: 8px; align-items: flex-end; }
.input-box {
  flex: 1;
  min-height: 38px; max-height: 100px;
  border: 1px solid #EBEEF5; border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px; font-family: inherit;
  resize: none; outline: none;
  background: #F8F9FB;
  transition: border-color .2s;
}
.input-box:focus { border-color: #409EFF; background: white; }
.send-btn {
  height: 38px; padding: 0 20px;
  background: #409EFF; color: white;
  border: none; border-radius: 20px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all .2s;
  flex-shrink: 0;
}
.send-btn:hover { background: #3A8EE6; transform: scale(1.03); }
.send-btn:active { transform: scale(.97); }
.send-btn:disabled { background: #A0CFFF; cursor: not-allowed; transform: none; }
</style>
