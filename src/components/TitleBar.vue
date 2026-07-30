<template>
  <!--
    统一标题栏组件
    主页和聊天窗口共用，支持拖拽
    [Bugfix] 按钮顺序：刷新 / 最小化 / 最大化 / 关闭
  -->
  <div class="titlebar">
    <div class="titlebar-left">
      <slot name="left"></slot>
    </div>
    <div class="titlebar-right">
      <slot name="right">
        <button class="titlebar-btn" title="刷新设备" @click="$emit('refresh')">🔄</button>
        <button class="titlebar-btn" title="最小化" @click="minimize">─</button>
        <button class="titlebar-btn" title="最大化" @click="maximize">□</button>
        <button class="titlebar-btn close" title="关闭" @click="close">✕</button>
      </slot>
    </div>
  </div>
</template>

<script setup>
defineEmits(['refresh'])

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
  -webkit-app-region: drag;  /* [Bugfix] 整个标题栏可拖拽 */
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
.titlebar-right {
  display: flex; gap: 4px;
  -webkit-app-region: no-drag;  /* 按钮不能拖拽 */
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
