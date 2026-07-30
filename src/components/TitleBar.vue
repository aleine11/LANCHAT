<template>
  <!--
    自定义标题栏
    无边框窗口需要自己画标题栏，同时支持窗口拖拽
  -->
  <div class="titlebar">
    <div class="titlebar-left">
      <span class="titlebar-logo">💬</span>
      <span class="titlebar-title">LanChat</span>
    </div>
    <div class="titlebar-right">
      <button class="titlebar-btn" title="设置" @click="$emit('openSettings')">⚙</button>
      <button class="titlebar-btn" title="最小化" @click="minimize">─</button>
      <button class="titlebar-btn" title="最大化" @click="maximize">□</button>
      <button class="titlebar-btn close" title="关闭" @click="close">✕</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['openSettings'])

function minimize() { window.electronAPI?.minimizeWindow() }
function maximize() { window.electronAPI?.maximizeWindow() }
function close() { window.electronAPI?.closeWindow() }
</script>

<style scoped>
.titlebar {
  height: 42px;
  background: #409EFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.titlebar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
}
.titlebar-logo {
  width: 20px; height: 20px;
  background: rgba(255,255,255,.25);
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.titlebar-right {
  display: flex; gap: 4px;
  -webkit-app-region: no-drag;
}
.titlebar-btn {
  width: 28px; height: 28px;
  border: none; background: none;
  color: rgba(255,255,255,.85);
  font-size: 14px; cursor: pointer;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.titlebar-btn:hover { background: rgba(255,255,255,.15); color: white; }
.titlebar-btn.close:hover { background: #E81123; }
</style>
