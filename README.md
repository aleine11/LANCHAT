# LanChat - 局域网聊天工具

> 同一 WiFi 下的 Windows 电脑之间实时聊天，支持发送文字和图片。

## 当前状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目骨架 | ✅ 完成 | Electron 28 + Vue 3 + Vite 5 + SCSS |
| 数据库层 | ✅ 完成 | SQLite 3 表（chat_history / config / contacts）+ DAO |
| 网络通信 | ✅ 完成 | UDP 广播发现（端口 5678）+ TCP 直连聊天（端口 5679） |
| IPC 整合 | ✅ 完成 | 15 个 invoke 通道 + 5 个事件推送通道 |
| 前端主界面 | ✅ 完成 | LocalSend 卡片风格 + 最近联系人 + 空状态 |
| 聊天窗口 | ✅ 完成 | 微信气泡风格 + 输入栏 + 图片预览 + 右键删除 |
| 图片功能 | ✅ 完成 | 选择/粘贴/拖拽三种输入 + 本地存储 |
| 系统托盘 | ✅ 完成 | 最小化到托盘 + 不退出 |
| 打包 | ✅ 完成 | 免安装 exe 文件夹，输出到 `release/win-unpacked/` |

## 已实现功能

- 🔍 UDP 自动发现局域网内 LanChat 设备
- 💬 TCP 直连实时文字聊天
- 🖼️ 图片发送（选文件 / Ctrl+V 粘贴 / 拖拽）
- 💾 SQLite 本地消息持久化（退出重进消息不丢失）
- 🔔 全局消息提示音（Web Audio API 合成）
- 🔌 断联仍可聊天（消息先存库，重连后自动重发）
- 🕐 最近联系人列表（5 秒自动刷新）
- 🗑️ 消息右键删除
- 📌 进入聊天自动定位最新消息
- 🖥️ 系统托盘（关闭窗口不退出）

## 如何启动项目

### 前提条件
- 已安装 **Node.js**（命令行输入 `node --version` 有版本号即可）

### 开发模式

```bash
cd LanChat
npm install          # 首次运行，安装依赖
npm run dev          # 启动 Vite + Electron 开发模式
```

### 打包为 exe

```bash
npm run electron:build    # Vite 编译 + electron-builder 打包
```

生成的免安装包在 `release/win-unpacked/` 目录，双击 `LanChat.exe` 运行。

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端 UI | Vue 3 + Element Plus + Pinia |
| 构建 | Vite 5 |
| 设备发现 | UDP 广播（dgram） |
| 聊天通信 | TCP 直连（net） |
| 本地存储 | SQLite（better-sqlite3） |
| 图片处理 | sharp |
| 打包 | electron-builder（dir 免安装） |

## 项目结构

```
LanChat/
├── electron/                # Electron 主进程
│   ├── main.js              # 主进程入口、窗口管理、IPC 注册
│   ├── preload.js           # 安全桥接（白名单 IPC 通道）
│   ├── db/                  # SQLite 数据库层
│   │   ├── database.js      # 连接管理 + 建表
│   │   ├── chatDao.js       # 聊天记录 + 联系人 CRUD
│   │   └── configDao.js     # 配置项 CRUD
│   ├── tcp/                 # TCP 通信模块
│   │   ├── server.js        # 服务端（被动监听 + 主动连接统一管理）
│   │   └── client.js        # 客户端（主动连接对方）
│   ├── udp/                 # UDP 设备发现
│   │   └── discovery.js     # 广播 + 监听 + 心跳 + 离线检测
│   └── utils/               # 工具函数
│       ├── netUtil.js       # IP/网段计算
│       └── imageUtil.js     # 图片存储/路径转换
├── src/                     # Vue 3 前端
│   ├── main.js              # Vue 入口
│   ├── App.vue              # 根组件（全局提示音订阅）
│   ├── router/index.js      # 路由（/ + /chat/:ip）
│   ├── stores/              # Pinia 状态管理
│   │   ├── device.js        # 设备列表 + 连接状态
│   │   ├── chat.js          # 聊天消息（全量加载）
│   │   └── user.js          # 用户配置
│   ├── views/               # 页面
│   │   ├── DeviceList.vue   # 主界面（设备 + 联系人）
│   │   └── ChatWindow.vue   # 聊天窗口
│   ├── components/          # 组件
│   │   ├── TitleBar.vue     # 自定义标题栏
│   │   ├── MyDeviceCard.vue # 我的设备卡片
│   │   ├── DeviceCard.vue   # 设备卡片
│   │   ├── MessageBubble.vue # 消息气泡
│   │   ├── ChatInput.vue    # 输入栏
│   │   ├── ImagePreview.vue # 图片预览
│   │   ├── SettingsDialog.vue # 设置弹窗
│   │   └── EmptyState.vue   # 空状态
│   └── utils/               # 前端工具
│       ├── ipc.js           # IPC 通信封装
│       └── notification.js  # 提示音效
├── docs/                    # 设计文档 + 知识点笔记
├── 产品原型/                 # HTML 原型页面
└── package.json             # 项目配置
```
