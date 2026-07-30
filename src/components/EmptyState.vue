<template>
  <!-- 空状态 / 扫描中 -->
  <div class="empty-wrap">
    <div v-if="scanning" class="empty-card">
      <div class="empty-icon">📡</div>
      <div class="empty-title">正在搜索局域网设备...</div>
      <div class="scanning-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <div class="empty-desc">正在监听UDP广播，等待其他设备上线</div>
    </div>
    <div v-else class="empty-card">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">未发现其他设备</div>
      <div class="empty-desc">暂时没有找到局域网内的其他设备</div>
      <div class="empty-tips">
        <strong>请确认：</strong><br>
        ① 两台电脑连接了 <strong>同一个WiFi/热点</strong><br>
        ② 对方也打开了 <strong>LanChat</strong><br>
        ③ 防火墙 <strong>允许 LanChat 通信</strong>
      </div>
      <button class="refresh-btn" @click="$emit('refresh')">🔄 点击刷新</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  scanning: { type: Boolean, default: false }
})
defineEmits(['refresh'])
</script>

<style scoped>
.empty-wrap {
  display: flex; align-items: center; justify-content: center;
  padding: 60px 40px;
}
.empty-card {
  text-align: center;
  max-width: 360px;
}
.empty-icon { font-size: 56px; margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.empty-desc { font-size: 13px; color: #909399; margin-bottom: 16px; }
.empty-tips {
  padding: 12px 16px; background: #ECF5FF; border-radius: 8px;
  font-size: 12px; color: #606266; text-align: left; line-height: 2;
  margin-bottom: 16px;
}
.empty-tips strong { color: #409EFF; }
.refresh-btn {
  padding: 8px 20px;
  background: #409EFF; color: white;
  border: none; border-radius: 20px;
  font-size: 14px; cursor: pointer;
  transition: all .2s;
}
.refresh-btn:hover { background: #3A8EE6; }
.scanning-dots { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
.dot {
  width: 10px; height: 10px;
  background: #409EFF; border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(.6); opacity: .5; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
