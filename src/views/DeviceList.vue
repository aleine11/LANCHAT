<template>
  <!--
    设备列表页面（占位）
    M5 模块时会用 LocalSend 风格的完整界面替换
  -->
  <div class="device-list-placeholder">
    <div class="welcome-card">
      <div class="welcome-icon">💬</div>
      <h1>LanChat</h1>
      <p>项目骨架搭建成功！</p>
      <p class="sub">Electron + Vue 3 + Vite 已就绪</p>
      <div class="info">
        <span>下一步：M4 IPC 通信整合</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// M5 模块时实现完整逻辑
</script>

<style scoped>
.device-list-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-page);
}
.welcome-card {
  text-align: center;
  padding: 48px 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
.welcome-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
h1 {
  font-size: 28px;
  color: #409EFF;
  margin-bottom: 8px;
}
p {
  font-size: 16px;
  color: #606266;
  margin-bottom: 4px;
}
.sub {
  font-size: 13px;
  color: #909399;
  margin-bottom: 20px;
}
.info {
  padding: 10px 16px;
  background: #ECF5FF;
  border-radius: 8px;
  font-size: 13px;
  color: #409EFF;
}
</style>
