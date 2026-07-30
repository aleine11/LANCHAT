<template>
  <!-- 设置弹窗 -->
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>⚙ 设置</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="dialog-body">
        <!-- 显示名称 -->
        <div class="form-group">
          <label>👤 显示名称</label>
          <input
            class="input"
            v-model="name"
            maxlength="20"
            placeholder="输入你的显示名称"
          />
          <span class="hint">其他设备将看到这个名称 · {{ name.length }}/20</span>
          <span v-if="error" class="error">{{ error }}</span>
        </div>

        <div class="divider"></div>

        <!-- 本机信息 -->
        <div class="form-group">
          <label>📋 本机信息</label>
          <div class="info-row"><span>本机IP</span><span>{{ userStore.ip }}</span></div>
          <div class="info-row"><span>主机名</span><span>—</span></div>
          <div class="info-row"><span>UDP 端口</span><span>5678</span></div>
          <div class="info-row"><span>TCP 端口</span><span>5679</span></div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-save" @click="save" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['close'])
const userStore = useUserStore()

const name = ref('')
const error = ref('')
const saving = ref(false)

onMounted(() => { name.value = userStore.name })

async function save() {
  error.value = ''
  if (!name.value.trim()) { error.value = '名称不能为空'; return }
  saving.value = true
  const res = await userStore.updateName(name.value.trim())
  saving.value = false
  if (res.success) {
    emit('close')
  } else {
    error.value = res.message
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.dialog {
  background: white; border-radius: 16px;
  width: 420px; max-width: 95vw;
  box-shadow: 0 12px 40px rgba(0,0,0,.15);
  animation: zoomIn .25s ease;
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(.92) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid #EBEEF5;
  font-size: 16px; font-weight: 600;
}
.close-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: none; background: none; font-size: 18px;
  cursor: pointer; color: #909399;
}
.close-btn:hover { background: #f0f0f0; }
.dialog-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 13px; font-weight: 600; color: #606266; }
.input {
  height: 40px; border: 1px solid #EBEEF5; border-radius: 8px;
  padding: 0 12px; font-size: 14px; outline: none;
  background: #F8F9FB; transition: border-color .2s;
}
.input:focus { border-color: #409EFF; background: white; }
.hint { font-size: 12px; color: #909399; }
.error { font-size: 12px; color: #F56C6C; }
.divider { height: 1px; background: #EBEEF5; }
.info-row {
  display: flex; justify-content: space-between;
  padding: 6px 0; font-size: 13px;
}
.info-row span:first-child { color: #909399; }
.info-row span:last-child { font-family: 'Courier New', monospace; }
.dialog-footer {
  padding: 16px 22px; border-top: 1px solid #EBEEF5;
  display: flex; justify-content: flex-end; gap: 10px;
}
.btn-cancel, .btn-save {
  height: 36px; padding: 0 20px; border-radius: 8px;
  font-size: 14px; cursor: pointer; border: none; font-weight: 500;
}
.btn-cancel { background: #f0f0f0; color: #606266; }
.btn-cancel:hover { background: #e0e0e0; }
.btn-save { background: #409EFF; color: white; }
.btn-save:hover { background: #3A8EE6; }
.btn-save:disabled { background: #A0CFFF; cursor: not-allowed; }
</style>
