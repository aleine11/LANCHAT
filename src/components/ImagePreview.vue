<template>
  <!-- 图片大图预览：暗色全屏 + 点击缩放 -->
  <div class="preview-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="preview-toolbar">
      <span class="preview-info">来自：{{ msg.fromName || '对方' }} · {{ formatTime(msg.createdAt) }}</span>
      <div class="toolbar-actions">
        <button class="tool-btn" v-if="canSave" @click="saveImage">💾 保存</button>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
    </div>
    <div class="preview-body" @click="toggleZoom">
      <!-- 能加载时显示真实图片 -->
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :class="['preview-img', { zoomed }]"
        alt="预览"
        @error="loadError = true"
      />
      <!-- 加载失败或暂无时显示占位 -->
      <div v-else class="preview-placeholder">
        <span class="ph-icon">🖼️</span>
        <span class="ph-text">无法加载图片</span>
        <span class="ph-size" v-if="msg.imageSize">{{ formatSize(msg.imageSize) }}</span>
      </div>
    </div>
    <div class="preview-footer">
      <span v-if="msg.fileName">{{ msg.fileName }}</span>
      <span v-if="msg.imageSize"> · {{ formatSize(msg.imageSize) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { imageApi } from '@/utils/ipc'

const props = defineProps({ msg: Object })
const emit = defineEmits(['close'])

const zoomed = ref(false)
const loadError = ref(false)
const canSave = computed(() => !!props.msg.imagePath || !!props.msg.content)

// 从主进程获取图片完整路径并显示
const imageSrc = ref('')

onMounted(async () => {
  // 尝试用 imagePath（相对路径）获取完整路径
  if (props.msg.imagePath && !props.msg.imagePath.startsWith('data:')) {
    try {
      const res = await imageApi.getPath(props.msg.imagePath)
      if (res.code === 200 && res.data.fullPath) {
        imageSrc.value = 'file://' + res.data.fullPath
        return
      }
    } catch (e) { /* fallback */ }
  }
  // 如果是 base64 数据直接显示
  if (typeof props.msg.content === 'string' && props.msg.content.startsWith('data:')) {
    imageSrc.value = props.msg.content
    return
  }
  // 尝试用 content 字段作为路径
  if (typeof props.msg.content === 'string' && !props.msg.content.startsWith('{')) {
    try {
      const res = await imageApi.getPath(props.msg.content)
      if (res.code === 200 && res.data.fullPath) {
        imageSrc.value = 'file://' + res.data.fullPath
      }
    } catch (e) { /* fallback */ }
  }
})

function toggleZoom() {
  zoomed.value = !zoomed.value
}

function saveImage() {
  if (!imageSrc.value) return
  // Electron 环境下可通过 IPC 调保存对话框
  console.log('[Preview] 保存图片（后续可用dialog.showSaveDialog）:', imageSrc.value)
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
</script>

<style scoped>
.preview-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.92);
  display: flex; flex-direction: column;
  color: white;
}
.preview-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0,0,0,.5); backdrop-filter: blur(12px);
}
.preview-info { font-size: 13px; color: #ccc; }
.toolbar-actions { display: flex; gap: 8px; align-items: center; }
.tool-btn {
  height: 32px; padding: 0 14px;
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08); color: white;
  border-radius: 6px; font-size: 13px; cursor: pointer;
}
.tool-btn:hover { background: rgba(255,255,255,.15); }
.close-btn {
  width: 36px; height: 36px; border: none;
  background: rgba(255,255,255,.1); color: white;
  border-radius: 8px; font-size: 18px; cursor: pointer;
}
.close-btn:hover { background: rgba(255,100,100,.4); }
.preview-body {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 20px; overflow: auto;
}
.preview-img {
  max-width: 90vw; max-height: 80vh;
  border-radius: 8px; cursor: zoom-in;
  transition: transform .3s; object-fit: contain;
}
.preview-img.zoomed {
  cursor: zoom-out; transform: scale(2);
}
.preview-placeholder {
  text-align: center; opacity: .6;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
}
.ph-icon { font-size: 80px; }
.ph-text { font-size: 16px; }
.ph-size { font-size: 13px; color: #999; }
.preview-footer {
  padding: 12px; text-align: center;
  background: rgba(0,0,0,.5); backdrop-filter: blur(12px);
  font-size: 13px; color: #999;
}
</style>
