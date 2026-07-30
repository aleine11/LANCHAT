// ===== Vue 3 应用入口 =====
// 这是前端（渲染进程）的起点
// 挂载 Vue 实例、注册插件、启动路由

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './assets/styles/global.scss'

const app = createApp(App)

// Pinia 状态管理（像前端"共享数据库"）
app.use(createPinia())

// Vue Router 路由（页面跳转）
app.use(router)

// Element Plus UI 组件库（按钮、输入框、弹窗等）
app.use(ElementPlus, { locale: undefined })

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
