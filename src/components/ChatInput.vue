<template>
  <!-- 聊天输入栏：文字+图片+拖拽 -->
  <div class="input-area" @dragover.prevent @drop.prevent="onDrop">
    <div class="input-toolbar">
      <button class="toolbar-btn" title="选择图片" @click="selectImage">🖼️</button>
      <span class="hint-text">回车发送 · Shift+回车换行 · Ctrl+V粘贴图片 · 拖拽图片到此处</span>
    </div>
    <div class="input-row">
      <textarea
        ref="inputRef"
        class="input-box"
        v-model="text"
        :placeholder="props.disabled ? '未连接，无法发送消息' : '输入消息...'"
        rows="1"
        :disabled="props.disabled"
        @keydown="onKeydown"
        @paste="onPaste"
      ></textarea>
      <button class="send-btn" @click="send" :disabled="!text.trim() || props.disabled">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { imageApi } from '@/utils/ipc'

const emit = defineEmits(['send', 'sendImage'])
const props = defineProps({
  disabled: { type: Boolean, default: false }
})
const text = ref('')
const inputRef = ref(null)

function send() {
  if (!text.value.trim()) return
  emit('send', text.value.trim())
  text.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// Ctrl+V 粘贴图片
function onPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file && file.size < 20 * 1024 * 1024) {
        // 将粘贴的文件转为本地路径（通过 Electron）
        handleImageFile(file)
        return
      }
    }
  }
}

// 拖拽图片
function onDrop(e) {
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  for (const file of files) {
    if (file.type.startsWith('image/') && file.size < 20 * 1024 * 1024) {
      handleImageFile(file)
      return
    }
  }
}

// 点击选择图片
async function selectImage() {
  const res = await imageApi.select()
  if (res.code === 200 && res.data.success) {
    emit('sendImage', res.data.filePath)
  }
}

// 处理图片文件（粘贴/拖拽的 File 对象）
function handleImageFile(file) {
  // 粘贴和拖拽得到的 File 对象有 path 属性（Electron 支持）
  // 否则转为 data URL 发给后端保存
  if (file.path) {
    emit('sendImage', file.path)
  } else {
    const reader = new FileReader()
    reader.onload = () => {
      // 发 data URL，后端保存到本地再发出去
      emit('sendImage', reader.result)
    }
    reader.readAsDataURL(file)
  }
}
</script>

<style scoped>
.input-area {
  background: white;
  border-top: 1px solid #EBEEF5;
  padding: 10px 16px;
  flex-shrink: 0;
}
.input-toolbar {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 8px;
}
.toolbar-btn {
  width: 30px; height: 30px;
  border: none; background: none;
  font-size: 18px; cursor: pointer; border-radius: 6px;
  color: #909399; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.toolbar-btn:hover { background: #ECF5FF; color: #409EFF; }
.hint-text { font-size: 11px; color: #C0C4CC; }
.input-row { display: flex; gap: 8px; align-items: flex-end; }
.input-box {
  flex: 1;
  min-height: 38px; max-height: 100px;
  border: 1px solid #EBEEF5; border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px; font-family: inherit;
  resize: none; outline: none;
  background: #F8F9FB; transition: border-color .2s;
}
.input-box:focus { border-color: #409EFF; background: white; }
.send-btn {
  height: 38px; padding: 0 20px;
  background: #409EFF; color: white;
  border: none; border-radius: 20px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all .2s; flex-shrink: 0;
}
.send-btn:hover { background: #3A8EE6; transform: scale(1.03); }
.send-btn:active { transform: scale(.97); }
.send-btn:disabled { background: #A0CFFF; cursor: not-allowed; transform: none; }
</style>
