// ===== 全局通知音效 =====
// 用 Web Audio API 合成简短提示音，避免引入音频文件

let audioCtx = null

/**
 * 播放"收到消息"提示音
 * 任何页面/组件都可以调用，全局生效
 */
export function playNotificationSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2)
    osc.stop(audioCtx.currentTime + 0.2)
  } catch (e) {
    // 静默忽略（浏览器策略或音频上下文被占用等）
  }
}