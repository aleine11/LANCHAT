// ===== Vue Router 路由配置 =====
// 定义前端页面的 URL 和对应组件
// 两个页面：
//   /          → DeviceList（设备列表主界面）
//   /chat/:ip  → ChatWindow（一对一聊天窗口）

import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'DeviceList',
    // 懒加载：首次访问时才加载组件，加快初始加载速度
    component: () => import('@/views/DeviceList.vue')
  },
  {
    path: '/chat/:ip',
    name: 'ChatWindow',
    component: () => import('@/views/ChatWindow.vue'),
    // 把路由参数传给组件作为 props（对方IP地址）
    props: true
  }
]

const router = createRouter({
  // Hash 模式：URL 中有 #，例如 /#/chat/192.168.1.3
  // Electron 环境下 Hash 模式最稳定，不需要服务端配置
  history: createWebHashHistory(),
  routes
})

export default router
