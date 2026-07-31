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

        <!-- 主题模式 -->
        <div class="form-group">
          <label>🌓 主题模式</label>
          <div class="theme-switch-row">
            <span class="theme-label">{{ theme === 'dark' ? '🌙 暗色模式' : '☀️ 浅色模式' }}</span>
            <label class="switch">
              <input type="checkbox" :checked="theme === 'dark'" @change="toggleTheme" />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="divider"></div>

        <!-- 保存目录 -->
        <div class="form-group">
          <label>📁 图片默认保存位置</label>
          <div class="path-row">
            <input
              class="input path-input"
              v-model="saveLocation"
              readonly
              placeholder="未设置（默认：系统下载目录）"
            />
            <button class="btn-browse" @click="selectDirectory">浏览</button>
          </div>
          <span class="hint">保存图片时会默认打开此目录</span>
        </div>

        <div class="divider"></div>

        <!-- 本机信息 -->
        <div class="form-group">
          <label>📋 本机信息</label>
          <div class="info-row"><span>显示名称</span><span>{{ userStore.name || '—' }}</span></div>
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
import { configApi, dialogApi } from '@/utils/ipc'

const emit = defineEmits(['close'])
const userStore = useUserStore()

const name = ref('')
const error = ref('')
const saving = ref(false)
const theme = ref('light')
const saveLocation = ref('')

onMounted(async () => {
  name.value = userStore.name

  // 加载配置
  try {
    const res = await configApi.getAll()
    if (res.code === 200 && res.data) {
      theme.value = res.data.theme || 'light'
      saveLocation.value = res.data.save_location || ''
    }
  } catch (e) { /* 忽略 */ }
})

function toggleTheme(e) {
  theme.value = e.target.checked ? 'dark' : 'light'
  // 即时预览主题效果
  document.documentElement.setAttribute('data-theme', theme.value)
}

async function selectDirectory() {
  const res = await dialogApi.selectDirectory()
  if (res.code === 200 && res.data.success) {
    saveLocation.value = res.data.path
  }
}

async function save() {
  error.value = ''
  if (!name.value.trim()) { error.value = '名称不能为空'; return }
  saving.value = true

  // 保存名称
  const nameRes = await userStore.updateName(name.value.trim())

  // 保存主题和目录配置
  try {
    await configApi.set('theme', theme.value)
    await configApi.set('save_location', saveLocation.value)
  } catch (e) { /* 忽略 */ }

  saving.value = false
  if (nameRes.success) {
    emit('close')
  } else {
    error.value = nameRes.message
  }
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: var(--dialog-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.dialog {
  background: var(--dialog-bg);
  border-radius: 16px;
  width: 460px; max-width: 95vw;
  box-shadow: var(--box-shadow-hover);
  animation: zoomIn .25s ease;
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(.92) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border-color);
  font-size: 16px; font-weight: 600; color: var(--text-primary);
}
.close-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: none; background: none; font-size: 18px;
  cursor: pointer; color: var(--text-secondary);
}
.close-btn:hover { background: var(--bg-hover); }
.dialog-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 13px; font-weight: 600; color: var(--text-regular); }
.input {
  height: 40px; border: 1px solid var(--border-color); border-radius: 8px;
  padding: 0 12px; font-size: 14px; outline: none;
  background: var(--bg-input); color: var(--text-primary);
  transition: border-color .2s;
}
.input:focus { border-color: #409EFF; background: var(--bg-card); }
.hint { font-size: 12px; color: var(--text-secondary); }
.error { font-size: 12px; color: #F56C6C; }
.divider { height: 1px; background: var(--border-color); }
.info-row {
  display: flex; justify-content: space-between;
  padding: 6px 0; font-size: 13px;
}
.info-row span:first-child { color: var(--text-secondary); }
.info-row span:last-child { font-family: 'Courier New', monospace; color: var(--text-primary); }

/* 主题切换开关 */
.theme-switch-row {
  display: flex; align-items: center; justify-content: space-between;
}
.theme-label { font-size: 14px; color: var(--text-primary); }
.switch {
  position: relative; display: inline-block; width: 48px; height: 26px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer;
  inset: 0; background: #C0C4CC;
  border-radius: 26px; transition: .3s;
}
.slider::before {
  content: ''; position: absolute; left: 3px; bottom: 3px;
  width: 20px; height: 20px; background: white;
  border-radius: 50%; transition: .3s;
}
.switch input:checked + .slider { background: #409EFF; }
.switch input:checked + .slider::before { transform: translateX(22px); }

/* 目录选择 */
.path-row {
  display: flex; gap: 8px;
}
.path-input { flex: 1; cursor: default; }
.btn-browse {
  height: 40px; padding: 0 16px;
  background: var(--color-primary-bg); color: #409EFF;
  border: 1px solid #66B1FF; border-radius: 8px;
  font-size: 13px; cursor: pointer;
  white-space: nowrap; transition: all .2s;
}
.btn-browse:hover { background: #409EFF; color: white; }

.dialog-footer {
  padding: 16px 22px; border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 10px;
}
.btn-cancel, .btn-save {
  height: 36px; padding: 0 20px; border-radius: 8px;
  font-size: 14px; cursor: pointer; border: none; font-weight: 500;
}
.btn-cancel { background: var(--bg-hover); color: var(--text-regular); }
.btn-cancel:hover { opacity: .8; }
.btn-save { background: #409EFF; color: white; }
.btn-save:hover { background: #3A8EE6; }
.btn-save:disabled { background: #A0CFFF; cursor: not-allowed; }
</style>
