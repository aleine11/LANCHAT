# LanChat v1.1.0 - 局域网聊天工具

> 同一 WiFi 下的 Windows 电脑之间实时聊天，支持发送文字和图片。

## 版本特性 (v1.1.0)

- 🎨 修复 Windows 任务栏图标显示问题
- 📦 支持便携版（免安装）和安装包两种分发方式
- 🔧 优化打包配置，图标资源正确加载

## 功能特性

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目骨架 | ✅ | Electron 28 + Vue 3 + Vite 5 + SCSS |
| 数据库层 | ✅ | SQLite 3 表 + DAO |
| 网络通信 | ✅ | UDP 广播发现 + TCP 直连聊天 |
| IPC 整合 | ✅ | 20 个 invoke 通道 + 事件推送 |
| 前端界面 | ✅ | 设备列表 + 聊天窗口 + 气泡风格 |
| 图片功能 | ✅ | 选择/粘贴/拖拽 + 本地存储 |
| 系统托盘 | ✅ | 最小化到托盘 |
| 打包发布 | ✅ | 便携版 + NSIS 安装包 |

## 已实现功能

- 🔍 UDP 自动发现局域网内 LanChat 设备
- 💬 TCP 直连实时文字聊天
- 🖼️ 图片发送（选文件 / Ctrl+V 粘贴 / 拖拽）
- 💾 SQLite 本地消息持久化
- 🔔 全局消息提示音
- 🔌 断联消息自动重试
- 🕐 最近联系人列表
- 🗑️ 消息右键删除
- 📁 图片保存到指定位置
- 🖥️ 系统托盘（关闭窗口不退出）

## 快速开始

### 前提条件

- **Node.js** >= 18

### 开发模式

```bash
npm install
npm run dev
```

### 打包发布

```bash
npm run electron:build
```

生成的文件在 `release/` 目录：
- `LanChat 1.0.0.exe` - 便携版，双击即用
- `LanChat Setup 1.0.0.exe` - 安装包

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端 UI | Vue 3 + Element Plus + Pinia |
| 构建 | Vite 5 |
| 设备发现 | UDP 广播 |
| 聊天通信 | TCP 直连 |
| 本地存储 | SQLite (better-sqlite3) |
| 图片处理 | sharp |
| 打包 | electron-builder |

## 项目结构

```
LanChat/
├── electron/                # Electron 主进程
│   ├── main.js              # 主进程入口
│   ├── preload.js           # 安全桥接
│   ├── db/                  # SQLite 数据库层
│   ├── tcp/                 # TCP 通信模块
│   ├── udp/                 # UDP 设备发现
│   └── utils/               # 工具函数
├── src/                     # Vue 3 前端
│   ├── components/          # 组件
│   ├── stores/              # Pinia 状态管理
│   ├── views/               # 页面
│   └── utils/               # 前端工具
├── build/                   # 打包资源（图标）
├── release/                 # 打包产物
└── package.json             # 项目配置
```

## 系统要求

- Windows 10/11 (x64)
- 局域网环境（同一 WiFi）

## License

MIT
