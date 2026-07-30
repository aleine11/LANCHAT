<template>
  <!--
    App.vue 是 Vue 应用的根组件
    只放一个 <router-view />，根据 URL 自动切换页面：
      /          → DeviceList（设备列表）
      /chat/:ip  → ChatWindow（聊天窗口）
  -->
  <router-view />
</template>

<script setup>
// 根组件暂时不需要逻辑，后续可以在 mounted 时初始化全局配置
</script>

<style>
/* 这里可以放全局的 CSS 重置，已在 global.scss 中处理 */
</style>
