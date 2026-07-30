# LanChat - 局域网聊天工具

> 同一 WiFi 下的 Windows 电脑之间实时聊天，支持发送文字和图片。

## 如何启动项目

### 前提条件
- 已安装 **Node.js**（命令行输入 `node --version` 有版本号即可）

### 启动步骤

```bash
# 1. 进入项目目录
cd LanChat

# 2. 安装依赖（首次运行或依赖有更新时执行，只需一次）
npm install

# 3. 启动开发模式（Vite + Electron 自动打开桌面窗口）
npm run dev
```

执行 `npm run dev` 后，会自动：
- 启动 Vite 前端开发服务器（端口 5173）
- 编译 Electron 主进程代码
- 打开 LanChat 桌面窗口

### 打包为 .exe 安装包

```bash
npm run electron:build
```

生成的安装包在 `release/` 目录下。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端 UI | Vue 3 + Element Plus |
| 构建 | Vite 5 |
| 设备发现 | UDP 广播 |
| 聊天通信 | TCP 直连 |
| 本地存储 | SQLite |

## 项目结构

```
LanChat/
├── electron/           # Electron 主进程（Node.js）
│   ├── main.js         # 主进程入口
│   ├── preload.js      # 安全桥接
│   └── db/             # SQLite 数据库层
├── src/                # Vue 3 前端
│   ├── views/          # 页面
│   ├── components/     # 组件
│   ├── stores/         # Pinia 状态管理
│   ├── router/         # 路由
│   └── assets/         # 样式资源
├── docs/               # 设计文档 + 知识点笔记
├── 产品原型/            # HTML 原型页面
└── package.json        # 项目配置
```
