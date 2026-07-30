// ===== 图片处理工具 =====
// 负责图片存储、路径转换

const path = require('path')
const fs = require('fs')
const { app } = require('electron')

const IMAGES_DIR = path.join(app.getPath('userData'), 'LanChat', 'images')

/**
 * 确保图片目录存在
 */
function ensureImageDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }
  return IMAGES_DIR
}

/**
 * 保存图片文件（从源路径复制）
 * @param {string} sourcePath - 原始文件路径
 * @param {string} [prefix='img'] - 文件名前缀
 * @returns {{ savedPath: string, relativePath: string, fileName: string }}
 */
function saveImage(sourcePath, prefix = 'img') {
  ensureImageDir()
  const ext = path.extname(sourcePath) || '.jpg'
  const fileName = `${prefix}_${Date.now()}${ext}`
  const destPath = path.join(IMAGES_DIR, fileName)
  fs.copyFileSync(sourcePath, destPath)
  const relativePath = `images/${fileName}`
  return { savedPath: destPath, relativePath, fileName }
}

/**
 * 保存 base64 或 data URL 图片
 * @param {string} dataUrl - data:image/xxx;base64,... 或纯 base64
 * @param {string} [prefix='img']
 * @returns {{ savedPath: string, relativePath: string, fileName: string }}
 */
function saveBase64Image(dataUrl, prefix = 'img') {
  ensureImageDir()

  let ext = '.jpg'
  let base64Str = dataUrl

  // 解析 data URL 格式
  if (dataUrl.startsWith('data:')) {
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (match) {
      const type = match[1] // png, jpeg, gif, webp...
      ext = type === 'jpeg' ? '.jpg' : `.${type}`
      base64Str = match[2]
    }
  }

  const fileName = `${prefix}_${Date.now()}${ext}`
  const destPath = path.join(IMAGES_DIR, fileName)
  fs.writeFileSync(destPath, Buffer.from(base64Str, 'base64'))
  const relativePath = `images/${fileName}`
  return { savedPath: destPath, relativePath, fileName }
}

/**
 * 获取图片完整路径
 * @param {string} relativePath - 相对路径（如 images/xxx.jpg）
 * @returns {string} 完整绝对路径
 */
function getImageFullPath(relativePath) {
  return path.join(app.getPath('userData'), 'LanChat', relativePath)
}

module.exports = { saveImage, saveBase64Image, getImageFullPath }
