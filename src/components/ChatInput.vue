<template>
  <!-- 聊天输入栏：文字+图片+拖拽 -->
  <div class="input-area" @dragover.prevent @drop.prevent="onDrop">
    <!-- [Bugfix] 手柄在最顶部 - 在图片按钮上方 -->
    <div class="resize-handle" @mousedown="startDrag">
      <div class="handle-bar"></div>
    </div>
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
        :style="{ height: inputHeight + 'px' }"
        :disabled="props.disabled"
        @keydown="onKeydown"
        @paste="onPaste"
        @input="autoResize"
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
const inputHeight = ref(38)  // [Bugfix] 用户拖动后的高度

// 拖动手柄逻辑：拖动上边沿拉大输入框
let dragStartY = 0
let dragStartHeight = 0
let isDragging = false
function startDrag(e) {
  isDragging = true
  dragStartY = e.clientY
  dragStartHeight = inputHeight.value
  document.body.style.cursor = 'ns-resize'
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}
function onDrag(e) {
  if (!isDragging) return
  // 鼠标向上拖 → 高度增加
  const delta = dragStartY - e.clientY
  const newHeight = Math.max(38, Math.min(300, dragStartHeight + delta))
  inputHeight.value = newHeight
}
function stopDrag() {
  isDragging = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function autoResize() {
  // 不再自动调整高度，由用户手动控制
  // 但当内容很多时，让高度自动增加到内容所需高度（不超过手动设置的上限）
  if (inputRef.value && !isDragging) {
    const scrollH = inputRef.value.scrollHeight
    // 仅在用户主动输入且内容溢出时扩展
    if (scrollH > inputHeight.value && scrollH <= 300) {
      inputHeight.value = scrollH
    }
  }
}

function send() {
  if (!text.value.trim()) return
  emit('send', text.value.trim())
  text.value = ''
  // 发送后重置为初始高度
  inputHeight.value = 38
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
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
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
  color: var(--text-secondary); transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.toolbar-btn:hover { background: var(--color-primary-bg); color: #409EFF; }
.hint-text { font-size: 11px; color: var(--text-placeholder); }
/* 拖动上边沿拉高输入框的手柄 */
.resize-handle {
  height: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: ns-resize;
  user-select: none;
  margin-bottom: 2px;
}
.resize-handle:hover .handle-bar { background: #409EFF; }
.handle-bar {
  width: 40px; height: 3px;
  background: var(--border-color);
  border-radius: 2px;
  transition: background .15s;
}
.input-row { display: flex; gap: 8px; align-items: flex-end; }
.input-box {
  flex: 1;
  min-height: 38px; max-height: 200px;
  border: 1px solid var(--border-color); border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px; font-family: inherit;
  resize: none; outline: none;
  color: var(--text-primary);
  background: var(--bg-input); transition: border-color .2s;
}
.input-box:focus { border-color: #409EFF; background: var(--bg-card); }
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
