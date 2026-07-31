/**
 * 图标生成脚本
 * 把微信图片转成多尺寸 png + ico
 * 用途：
 *   - build/icon.ico           electron-builder 打包用
 *   - build/icon.png           备用 (256x256)
 *   - src/assets/icons/icon.png  窗口/任务栏用 (256x256)
 *   - src/assets/icons/tray.png  托盘用 (32x32)
 *
 * 用法：node scripts/build-icon.js
 */

const sharp = require('sharp')
const pngToIcoModule = require('png-to-ico')
const pngToIco = pngToIcoModule.default || pngToIcoModule
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../img/微信图片_20260731092847_593_41.jpg')
const BUILD_DIR = path.resolve(__dirname, '../build')
const ASSETS_ICONS_DIR = path.resolve(__dirname, '../src/assets/icons')

// ICO 包含的尺寸（Windows 推荐）
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  await ensureDir(BUILD_DIR)
  await ensureDir(ASSETS_ICONS_DIR)

  console.log('正在读取原图:', SRC)
  const srcBuffer = fs.readFileSync(SRC)

  // ===== 1. 生成 ICO 内嵌的各尺寸 PNG 缓冲 =====
  const pngBuffers = []
  for (const size of ICO_SIZES) {
    const buf = await sharp(srcBuffer)
      .resize(size, size, { fit: 'cover' })  // 居中裁剪成正方形
      .png()
      .toBuffer()
    pngBuffers.push(buf)
    console.log(`  生成 ${size}x${size} png (${(buf.length / 1024).toFixed(1)} KB)`)
  }

  // ===== 2. 合成 ICO =====
  const icoBuffer = await pngToIco(pngBuffers)
  const icoPath = path.join(BUILD_DIR, 'icon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('  生成 ico:', icoPath, `(${(icoBuffer.length / 1024).toFixed(1)} KB)`)

  // ===== 3. 生成 256x256 PNG 给 electron-builder 备用 =====
  const png256 = await sharp(srcBuffer)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), png256)
  console.log('  生成 256x256 png:', path.join(BUILD_DIR, 'icon.png'))

  // ===== 4. 复制到 src/assets/icons/ 给窗口/任务栏用 =====
  fs.writeFileSync(path.join(ASSETS_ICONS_DIR, 'icon.png'), png256)
  console.log('  生成 256x256 png:', path.join(ASSETS_ICONS_DIR, 'icon.png'))

  // ===== 5. 生成 32x32 托盘图标 =====
  const trayPng = await sharp(srcBuffer)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(ASSETS_ICONS_DIR, 'tray.png'), trayPng)
  console.log('  生成 32x32 png:', path.join(ASSETS_ICONS_DIR, 'tray.png'))

  console.log('\n全部图标生成完成!')
}

main().catch(err => {
  console.error('生成失败:', err)
  process.exit(1)
})
