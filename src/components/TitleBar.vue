<template>
  <!--
    统一标题栏组件 - 主页和聊天窗口共用
    color: 'blue' (主页) | 'white' (聊天窗口)
  -->
  <div :class="['titlebar', color]">
    <div class="titlebar-left">
      <slot name="left"></slot>
    </div>
    <div class="titlebar-right">
      <slot name="right">
        <button class="titlebar-btn" title="设置" @click="$emit('openSettings')">⚙</button>
        <button class="titlebar-btn" title="最小化" @click="minimize">─</button>
        <button class="titlebar-btn" title="最大化" @click="maximize">□</button>
        <button class="titlebar-btn close" title="关闭" @click="close">✕</button>
      </slot>
    </div>
  </div>
</template>

<script setup>
defineProps({ color: { type: String, default: 'blue' } })
defineEmits(['openSettings', 'refresh'])

function minimize() { window.electronAPI?.minimizeWindow() }
function maximize() { window.electronAPI?.maximizeWindow() }
function close() { window.electronAPI?.closeWindow() }
</script>

<style scoped>
.titlebar {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.titlebar.blue { background: #409EFF; }
.titlebar.white { background: #fff; border-bottom: 1px solid var(--border-color); }
[data-theme="dark"] .titlebar.white { background: #252538; }

.titlebar-left {
  display: flex; align-items: center; gap: 10px;
  -webkit-app-region: no-drag;
  font-size: 14px; font-weight: 600;
}
.blue .titlebar-left { color: white; }
.white .titlebar-left { color: var(--text-primary); }

.titlebar-right {
  display: flex; gap: 4px;
  -webkit-app-region: no-drag;
}
.titlebar-btn {
  width: 28px; height: 28px;
  border: none; background: none;
  font-size: 14px; cursor: pointer;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.blue .titlebar-btn { color: rgba(255,255,255,.85); }
.blue .titlebar-btn:hover { background: rgba(255,255,255,.15); color: white; }
.white .titlebar-btn { color: var(--text-regular); }
.white .titlebar-btn:hover { background: var(--bg-hover); }

.titlebar-btn.close:hover { background: #E81123; color: white !important; }
</style>
