<template>
  <!-- 图片大图预览（M7完善，当前占位） -->
  <div class="preview-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="preview-toolbar">
      <span class="preview-info">来自：{{ msg.fromName || '对方' }}</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    <div class="preview-body">
      <div class="preview-placeholder">
        🖼️
      </div>
      <div class="preview-footer">
        {{ formatTime(msg.createdAt) }} · M7 将显示原图
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ msg: Object })
defineEmits(['close'])

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}
</script>

<style scoped>
.preview-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.9);
  display: flex; flex-direction: column;
  color: white;
}
.preview-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
}
.preview-info { font-size: 13px; color: #ccc; }
.close-btn {
  width: 36px; height: 36px; border: none;
  background: rgba(255,255,255,.1); color: white;
  border-radius: 8px; font-size: 18px; cursor: pointer;
}
.close-btn:hover { background: rgba(255,100,100,.4); }
.preview-body {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
}
.preview-placeholder {
  font-size: 100px; opacity: .5;
}
.preview-footer { font-size: 13px; color: #999; }
</style>
