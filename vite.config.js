import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { cpSync, existsSync, mkdirSync } from 'fs'

/**
 * 复制 electron 子目录到 dist-electron 的 Vite 插件
 * 
 * 为什么要这个？
 *   vite-plugin-electron 会把所有 import 的文件打包进 bundle，
 *   但 require() 动态引用的子目录（db/, udp/, tcp/, utils/）不会被包含，
 *   需要手动复制到 dist-electron 保持目录结构。
 *
 * （必须放在 electron 子构建的 plugins 中，否则不生效）
 */
function copySubModulesPlugin() {
  const dirs = ['db', 'udp', 'tcp', 'utils']
  return {
    name: 'copy-sub-modules',
    closeBundle() {
      for (const dir of dirs) {
        const src = resolve(__dirname, 'electron', dir)
        const dest = resolve(__dirname, 'dist-electron', dir)
        if (!existsSync(src)) continue
        if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
        cpSync(src, dest, { recursive: true })
        console.log(`[copy-sub-modules] electron/${dir} → dist-electron/${dir}`)
      }
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口
        entry: 'electron/main.js',
        vite: {
          plugins: [copySubModulesPlugin()],
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              // better-sqlite3 和 sharp 是 native module，必须 external 不能打包
              external: ['better-sqlite3', 'sharp']
            }
          }
        }
      },
      {
        // 预加载脚本入口
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  }
})
