<template>
  <!-- 单条消息气泡 -->
  <!-- message.isSelf: 0=对方(左对齐灰色), 1=自己(右对齐蓝色) -->
  <div
    :class="['msg-row', msg.isSelf ? 'self' : 'other']"
    @contextmenu.prevent="onContextMenu"
  >
    <div class="msg-avatar" :title="msg.isSelf ? '我' : fromName">
      {{ msg.isSelf ? '🖥️' : '💻' }}
    </div>
    <div class="msg-content">
      <!-- 文字消息 -->
      <div v-if="msg.contentType === 'text'" class="bubble">
        {{ msg.content }}
      </div>
      <!-- 图片消息 -->
      <div
        v-else-if="msg.contentType === 'image'"
        class="bubble bubble-image"
        @click="$emit('preview', msg)"
      >
        <img
          v-if="imageSrc"
          :src="imageSrc"
          class="img-real"
          @error="imgError = true"
          alt="图片"
        />
        <div v-else-if="imgError" class="img-failed">
          <span>🖼️</span>
          <span class="fail-text">图片加载失败</span>
        </div>
        <div v-else class="img-loading">
          <span>🖼️</span>
          <span>加载中...</span>
        </div>
      </div>
      <!-- 时间 + 状态 -->
      <div class="msg-meta">
        <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
        <span v-if="msg.isSelf && msg.status === 'pending'" class="msg-status pending">发送中</span>
        <span v-else-if="msg.isSelf && msg.status === 'failed'" class="msg-status waiting">待接收</span>
        <span v-else-if="msg.isSelf && msg.status === 'sent'" class="msg-status sent">已发送</span>
        <!-- [Bugfix] 右键删除消息 -->
        <span v-if="contextMenuVisible" class="msg-action" @click.stop="$emit('delete', msg)">🗑️ 删除</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { imageApi } from '@/utils/ipc'

const props = defineProps({
  msg: { type: Object, required: true },
  fromName: { type: String, default: '' }
})
defineEmits(['preview', 'delete'])

const contextMenuVisible = ref(false)

function onContextMenu(e) {
  // 只对自己发送的消息显示删除菜单
  if (props.msg.isSelf) {
    contextMenuVisible.value = true
    // 3秒后自动关闭
    setTimeout(() => { contextMenuVisible.value = false }, 3000)
  }
}

const imageSrc = ref('')
const imgError = ref(false)

// 异步获取图片完整路径并转换为 file:// 协议
async function loadImage() {
  imgError.value = false
  if (props.msg.contentType !== 'image') return

  // 优先用 imagePath（数据库存的相对路径）
  const path = props.msg.imagePath || props.msg.content
  if (!path) return

  // 如果已经是 data URL，直接用
  if (path.startsWith('data:')) {
    imageSrc.value = path
    return
  }

  // 通过 IPC 拼接完整路径
  try {
    const res = await imageApi.getPath(path)
    if (res.code === 200 && res.data.fullPath) {
      // Windows 路径需要转 file:// 协议 + 反斜杠转正斜杠
      imageSrc.value = 'file:///' + res.data.fullPath.replace(/\\/g, '/')
    } else {
      imgError.value = true
    }
  } catch (e) {
    imgError.value = true
  }
}

onMounted(loadImage)
watch(() => props.msg.imagePath, loadImage)

function formatTime(timeStr) {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.msg-row {
  display: flex; gap: 8px; margin-bottom: 10px;
  animation: msgIn .3s ease;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.msg-row.self { justify-content: flex-end; }
.msg-row.other { justify-content: flex-start; }
.msg-avatar {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.msg-row.other .msg-avatar { background: #E8F4FD; }
.msg-row.self .msg-avatar { background: #ECF5FF; }
.msg-row.self .msg-avatar { order: 2; }
.msg-content { max-width: 55%; }
.msg-row.self .msg-content { text-align: right; }
.bubble {
  display: inline-block;
  padding: 10px 14px; border-radius: 12px;
  font-size: 14px; line-height: 1.5;
  word-break: break-all;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.msg-row.other .bubble {
  background: white; color: #303133;
  border-top-left-radius: 2px;
}
.msg-row.self .bubble {
  background: #409EFF; color: white;
  border-top-right-radius: 2px;
}
.bubble-image {
  padding: 4px; cursor: pointer;
  max-width: 220px; transition: transform .2s;
  background: transparent !important;
  box-shadow: none;
}
.bubble-image:hover { transform: scale(1.02); }
.img-real {
  width: 200px; max-height: 200px;
  object-fit: cover; border-radius: 6px;
  display: block;
}
.img-loading, .img-failed {
  width: 200px; height: 140px;
  background: linear-gradient(135deg, #d0d5dd, #b0b5bd);
  border-radius: 6px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: #fff; font-size: 12px;
}
.img-failed { background: linear-gradient(135deg, #F56C6C, #c45656); }
.msg-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #C0C4CC;
  margin-top: 2px; padding: 0 4px;
  justify-content: flex-end;
}
.msg-row.other .msg-meta { justify-content: flex-start; }
.msg-status { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.msg-status.pending { color: #909399; }
.msg-status.waiting { color: #E6A23C; }  /* [Bugfix] 待接收用橙色，不刺眼 */
.msg-status.sent { color: #909399; }
.msg-action {
  background: #F56C6C; color: white;
  padding: 2px 8px; border-radius: 4px;
  cursor: pointer; font-size: 11px;
  margin-left: 4px;
}
.msg-action:hover { background: #dd6161; }
</style>
