<template>
  <div class="preview-overlay">
    <!-- 顶部工具栏 -->
    <div class="preview-toolbar">
      <span class="preview-info">来自：{{ msg.fromName || '对方' }} · {{ formatTime(msg.createdAt) }}</span>
      <div class="toolbar-actions">
        <button class="tool-btn" @click="onZoomOut">🔍−</button>
        <span class="zoom-label">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="tool-btn" @click="onZoomIn">🔍+</button>
        <button class="tool-btn" @click="onReset">↺</button>
        <span class="tool-sep">|</span>
        <button class="tool-btn" @click="onRotateCCW">↺</button>
        <button class="tool-btn" @click="onRotateCW">↻</button>
        <button class="tool-btn" @click="onFlipH">↔</button>
        <button class="tool-btn" @click="onFlipV">↕</button>
        <span class="tool-sep">|</span>
        <button class="tool-btn save-btn" v-if="canSave" @click="onSave">💾 保存</button>
        <button class="close-btn" @click="onClose">✕</button>
      </div>
    </div>

    <!-- 底部信息栏 -->
    <div class="preview-footer">
      <span v-if="msg.fileName">{{ msg.fileName }}</span>
      <span v-if="msg.imageSize"> · {{ formatSize(msg.imageSize) }}</span>
    </div>

    <!-- 图片区 -->
    <div class="preview-body" @wheel.prevent="onWheel">
      <div class="img-wrapper" ref="wrapperRef">
        <img
          v-if="imageSrc"
          :src="imageSrc"
          class="preview-img"
          alt="预览"
          draggable="false"
        />
        <div v-else class="preview-placeholder">
          <span class="ph-icon">🖼️</span>
          <span class="ph-text">无法加载图片</span>
        </div>
      </div>
    </div>

    <!-- 提示 -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { imageApi } from '@/utils/ipc'

const props = defineProps({ msg: Object })
const emit = defineEmits(['close'])

const canSave = computed(() => !!props.msg.imagePath || (typeof props.msg.content === 'string' && props.msg.content.startsWith('images/')))

const wrapperRef = ref(null)
const imageSrc = ref('')
const loadError = ref(false)

// 变换状态
const zoomLevel = ref(1)
const rotation = ref(0)
const flipX = ref(1)
const flipY = ref(1)

// Toast
const showToast = ref(false)
const toastMsg = ref('')
let toastTimer = null
function showToastMessage(msg) {
  toastMsg.value = msg
  showToast.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { showToast.value = false }, 2000)
}

// 把状态写入 CSS 变量，驱动 transform
function syncTransform() {
  const el = wrapperRef.value
  if (!el) return
  el.style.setProperty('--zoom', zoomLevel.value)
  el.style.setProperty('--rot', rotation.value + 'deg')
  el.style.setProperty('--fx', flipX.value)
  el.style.setProperty('--fy', flipY.value)
}
watch([zoomLevel, rotation, flipX, flipY], syncTransform)

// 加载图片
onMounted(async () => {
  if (props.msg.imagePath && !props.msg.imagePath.startsWith('data:')) {
    try {
      const res = await imageApi.getPath(props.msg.imagePath)
      if (res.code === 200 && res.data.fullPath) {
        imageSrc.value = 'file:///' + res.data.fullPath.replace(/\\/g, '/')
      }
    } catch (e) { /* ignore */ }
  } else if (typeof props.msg.content === 'string' && props.msg.content.startsWith('data:')) {
    imageSrc.value = props.msg.content
  } else if (typeof props.msg.content === 'string' && !props.msg.content.startsWith('{')) {
    try {
      const res = await imageApi.getPath(props.msg.content)
      if (res.code === 200 && res.data.fullPath) {
        imageSrc.value = 'file:///' + res.data.fullPath.replace(/\\/g, '/')
      }
    } catch (e) { /* ignore */ }
  }

  // 初始同步
  syncTransform()

  // 监听 ESC
  const onEsc = (e) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', onEsc)
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onEsc)
    clearTimeout(toastTimer)
  })
})

// 缩放/旋转/翻转（每个函数都加了 console.log 便于排查）
function onZoomIn() { console.log('[Preview] 放大'); zoomLevel.value = Math.min(5, zoomLevel.value + 0.25) }
function onZoomOut() { console.log('[Preview] 缩小'); zoomLevel.value = Math.max(0.25, zoomLevel.value - 0.25) }
function onWheel(e) { e.deltaY < 0 ? onZoomIn() : onZoomOut() }
function onReset() { console.log('[Preview] 还原'); zoomLevel.value = 1; rotation.value = 0; flipX.value = 1; flipY.value = 1 }
function onRotateCCW() { console.log('[Preview] 逆时针旋转'); rotation.value = (rotation.value - 90 + 360) % 360 }
function onRotateCW() { console.log('[Preview] 顺时针旋转'); rotation.value = (rotation.value + 90) % 360 }
function onFlipH() { console.log('[Preview] 水平翻转'); flipX.value *= -1 }
function onFlipV() { console.log('[Preview] 垂直翻转'); flipY.value *= -1 }
function onClose() { console.log('[Preview] 关闭'); emit('close') }

// 保存
async function onSave() {
  console.log('[Preview] 保存按钮点击')

  const relativePath = props.msg.imagePath ||
    (typeof props.msg.content === 'string' && !props.msg.content.startsWith('data:') && !props.msg.content.startsWith('{') ? props.msg.content : null)

  if (!relativePath) { showToastMessage('无法保存此图片'); return }

  const defaultName = props.msg.fileName || relativePath.replace(/^images\//, '')

  try {
    console.log('[Preview] 调用 saveToPath:', relativePath, defaultName)
    const res = await imageApi.saveToPath(relativePath, defaultName)
    console.log('[Preview] saveToPath 返回:', res)
    showToastMessage(res.code === 200 && res.data.success ? '保存成功' : (res.message || '保存失败'))
  } catch (e) {
    console.error('[Preview] 保存失败:', e)
    showToastMessage('保存失败')
  }
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
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.92);
  color: white;
  -webkit-app-region: no-drag;
}

/* 工具栏：绝对定格在顶部，最高层级 */
.preview-toolbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10002;
  display: flex; align-items: center; justify-content: space-between;
  height: 54px; padding: 0 16px;
  background: rgba(0,0,0,.75);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
  /* [关键修复] 必须声明 no-drag，否则会被 TitleBar 的 drag 区域吞噬点击 */
  -webkit-app-region: no-drag;
}
.preview-info { font-size: 13px; color: #ccc; pointer-events: none; user-select: none; }
.toolbar-actions { display: flex; gap: 6px; align-items: center; }

.tool-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 34px; min-width: 34px; padding: 0 10px;
  border: 1px solid rgba(255,255,255,.3);
  background: rgba(255,255,255,.1); color: white;
  border-radius: 6px; font-size: 14px;
  cursor: pointer; user-select: none;
  transition: background .15s;
}
.tool-btn:hover { background: rgba(255,255,255,.25); }
.tool-btn:active { background: rgba(255,255,255,.4); }
.tool-btn.save-btn { background: rgba(64,158,255,.4); border-color: rgba(64,158,255,.6); }
.tool-btn.save-btn:hover { background: rgba(64,158,255,.6); }
.zoom-label { font-size: 12px; color: #ccc; min-width: 42px; text-align: center; user-select: none; }
.tool-sep { color: rgba(255,255,255,.2); font-size: 14px; margin: 0 2px; user-select: none; }

.close-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border: none; background: rgba(255,255,255,.15); color: white;
  border-radius: 8px; font-size: 18px; cursor: pointer;
  margin-left: 4px;
}
.close-btn:hover { background: rgba(255,100,100,.4); }

/* 底部信息栏：定格在底部 */
.preview-footer {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 10001;
  height: 30px; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5);
  font-size: 13px; color: #999;
}

/* 图片展示区 */
.preview-body {
  position: fixed; top: 54px; left: 0; right: 0; bottom: 30px;
  display: flex; align-items: center; justify-content: center;
  overflow: auto; padding: 20px;
}

/* 包装层：应用 transform */
.img-wrapper {
  display: inline-block;
  transform: scale(var(--zoom, 1)) rotate(var(--rot, 0deg)) scaleX(var(--fx, 1)) scaleY(var(--fy, 1));
  transition: transform .3s ease;
}
.preview-img {
  max-width: 70vw; max-height: calc(100vh - 140px);
  border-radius: 8px; object-fit: contain;
  display: block;
  pointer-events: none; user-select: none; -webkit-user-drag: none;
}

.preview-placeholder {
  text-align: center; opacity: .6;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
  color: white;
}
.ph-icon { font-size: 80px; }
.ph-text { font-size: 16px; }

/* Toast */
.toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,.85); color: white;
  padding: 12px 32px; border-radius: 24px;
  font-size: 14px; font-weight: 500;
  z-index: 10003;
  box-shadow: 0 4px 20px rgba(0,0,0,.4);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>