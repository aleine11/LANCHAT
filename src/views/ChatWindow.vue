<template>
  <!--
    聊天窗口页面（占位）
    M6 模块时用微信气泡风格的完整界面替换
  -->
  <div class="chat-placeholder">
    <div class="chat-info">
      <span>←</span>
      <h2>聊天窗口（占位）</h2>
    </div>
    <p>对方IP：{{ ip }}</p>
    <p class="note">M6 模块时将实现完整的微信气泡对话界面</p>
  </div>
</template>

<script setup>
// 接收路由参数：对方的IP地址
defineProps({
  ip: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.chat-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f5f5;
  gap: 12px;
}
.chat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
h2 {
  color: #409EFF;
}
.note {
  font-size: 13px;
  color: #909399;
}
</style>
