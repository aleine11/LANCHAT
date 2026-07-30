import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { cpSync, existsSync, mkdirSync } from 'fs'

/**
 * 复制 electron/db 目录到 dist-electron/db 的 Vite 插件
 * （必须放在 electron 子构建的 plugins 中，否则不生效）
 */
function copyDbModulePlugin() {
  return {
    name: 'copy-db-module',
    closeBundle() {
      const src = resolve(__dirname, 'electron', 'db')
      const dest = resolve(__dirname, 'dist-electron', 'db')
      if (!existsSync(src)) return
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
      console.log('[copy-db-module] 已复制 electron/db → dist-electron/db')
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
          plugins: [copyDbModulePlugin()],
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
